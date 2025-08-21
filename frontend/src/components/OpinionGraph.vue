<template>
  <div ref="cyContainer" class="cytoscape-container" @contextmenu.prevent></div>
  <div v-if="selectedNode" class="meta-panel" :style="metaPanelStyle">
    <h3>节点元数据</h3>
    <div v-for="(v, k) in selectedNodeData" :key="k">
      <b>{{ k }}:</b> {{ v }}
    </div>
  </div>
  <div v-if="selectedEdge" class="meta-panel" :style="edgeMetaPanelStyle">
    <h3>连接元数据</h3>
    <div v-for="(v, k) in selectedEdgeData" :key="k">
      <b>{{ k }}:</b> {{ v }}
    </div>
  </div>

  <!-- 右键菜单 -->
  <div v-if="showContextMenu" class="context-menu" :style="contextMenuStyle" @click.stop>
    <!-- 节点右键菜单 -->
    <div v-if="contextMenuType === 'node'">
      <div class="context-menu-item" @click="handleMenuAction('editOpinion')">
        <span class="menu-icon">✎</span>
        编辑观点
      </div>
      <div class="context-menu-item" @click="handleMenuAction('deleteOpinion')">
        <span class="menu-icon">×</span>
        删除观点
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('addOpinion')">
        <span class="menu-icon">+</span>
        添加观点
      </div>
      <div class="context-menu-item" @click="handleMenuAction('addLink')">
        <span class="menu-icon">↔</span>
        添加连接
      </div>
    </div>

    <!-- 边右键菜单 -->
    <div v-if="contextMenuType === 'edge'">
      <div class="context-menu-item" @click="handleMenuAction('editLink')">
        <span class="menu-icon">✎</span>
        编辑连接
      </div>
      <div class="context-menu-item" @click="handleMenuAction('deleteLink')">
        <span class="menu-icon">×</span>
        删除连接
      </div>
    </div>

    <!-- 空白区域右键菜单 -->
    <div v-if="contextMenuType === 'canvas'">
      <div class="context-menu-item" @click="handleMenuAction('addOpinion')">
        <span class="menu-icon">+</span>
        添加观点
      </div>
      <div class="context-menu-item" @click="handleMenuAction('addLink')">
        <span class="menu-icon">↔</span>
        添加连接
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleMenuAction('refreshView')">
        <span class="menu-icon">⟲</span>
        刷新视图
      </div>
      <div class="context-menu-item" @click="handleMenuAction('fitToScreen')">
        <span class="menu-icon">⤢</span>
        适配屏幕
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Element, GraphLayout, Node, Edge } from '@/types';
import type { Core, NodeSingular, EdgeSingular, EventObject } from 'cytoscape';

// 类型断言以避免cytoscape版本冲突
cytoscape.use(dagre as any);

interface Props {
  elements: Array<Element>;  // [{ data: { id, label, ... }, classes: '' }, ...]
  layout?: GraphLayout;
  styleOptions?: any;
}

const props = withDefaults(defineProps<Props>(), {
  elements: () => [],
  layout: () => ({
    name: 'dagre',
    rankDir: 'BT',
    nodeSep: 50,
    edgeSep: 10,
    rankSep: 80,
    fit: true,
    padding: 50,
  }),
  styleOptions: () => ({}),
});

const emit = defineEmits<{
  nodeDblClick: [nodeData: Node];
  viewportChanged: [extent: any];
  nodeSelected: [nodeData: Node | null];
  edgeSelected: [edgeData: Edge | null];
  contextMenuAction: [action: string];
}>();

const cyContainer = ref<HTMLElement | null>(null);
let cy: Core | null = null;
const selectedNode = ref<NodeSingular | null>(null);
const selectedNodeData = ref<Record<string, any>>({});
const selectedEdge = ref<EdgeSingular | null>(null);
const selectedEdgeData = ref<Record<string, any>>({});
const metaPanelStyle = ref<Record<string, string>>({});
const edgeMetaPanelStyle = ref<Record<string, string>>({});
const showContextMenu = ref(false);
const contextMenuStyle = ref<Record<string, string>>({});
const contextMenuType = ref('');
let tapTimer: number | null = null; // 新增延时定时器

function getNodeSize(node: NodeSingular) {
  // 依据正证分、反证分平均值调整节点大小
  const pos = node.data('positive_score');
  const neg = node.data('negative_score');
  let avg = null;
  if (pos != null && neg != null) avg = (pos + neg) / 2;
  else if (pos != null) avg = pos;
  else if (neg != null) avg = neg;
  if (avg == null) return 40;
  return 60 + 120 * avg; // 最小30，最大90
}

function wrapLabelText(text: string, width: number, zoomFactor = 0.05): string {
  if (!text) return '';
  const scaledWidth = Math.floor(width * zoomFactor);
  if (scaledWidth < 1) return text;

  // 将文本每 scaledWidth 个字符分隔成一行
  const regex = new RegExp(`.{1,${scaledWidth}}`, 'g');
  const lines = text.match(regex) || [];

  // 以最大行数限制，当行数超过时，最后一行添加省略号
  const maxLines = 2;
  if (lines.length > maxLines) {
    lines[maxLines - 1] = lines[maxLines - 1] + '…';
    return lines.slice(0, maxLines).join('\n');
  }
  return lines.join('\n');
}

// 处理右键菜单事件
function showContextMenuAt(x: number, y: number, type: string): void {
  showContextMenu.value = true;
  contextMenuType.value = type;
  contextMenuStyle.value = {
    left: `${x}px`,
    top: `${y}px`,
  };
}

function hideContextMenu(): void {
  showContextMenu.value = false;
}

function handleMenuAction(action: string): void {
  hideContextMenu();
  emit('contextMenuAction', action);
}

onMounted(() => {
  nextTick(() => {
    cy = cytoscape({
      container: cyContainer.value,
      elements: props.elements,
      layout: props.layout || {
        name: 'dagre',
        rankDir: 'BT', // top-bottom
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 80,
        fit: true,
        padding: 50,
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: any) => (ele.data('logic_type') === 'and' ? '#809fff' : '#ffafe7'),
            label: (ele: any) => wrapLabelText(ele.data('label'), getNodeSize(ele)),
            width: (ele: any) => getNodeSize(ele),
            height: (ele: any) => getNodeSize(ele),
            'font-size': 14,
            color: '#222',
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': (ele: any) => (ele.data('has_more_children') ? 6 : 0),
            'border-color': '#bbb',
            opacity: 0.95,
            'text-wrap': 'wrap',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 4,
            'line-color': (ele: any) => (ele.data('link_type') === 'supports' ? '#00b894' : '#e17055'),
            'target-arrow-color': (ele: any) =>
              ele.data('link_type') === 'supports' ? '#00b894' : '#e17055',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.7,
          },
        },
      ],
    });
    cy.on('tap', 'node', (evt) => {
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        selectedNode.value = evt.target;
        selectedEdge.value = null;
        selectedEdgeData.value = {};
        // 创建元数据对象并去除relationship字段
        const data = { ...evt.target.data() };
        delete data.relationship;
        delete data.label;
        delete data.score;
        selectedNodeData.value = data;
        // 计算元数据栏位置
        const pos = evt.position || evt.target.position();
        const containerRect = cyContainer.value?.getBoundingClientRect();
        if (!containerRect || !cy) return;
        const zoom = cy.zoom();
        const pan = cy.pan();
        metaPanelStyle.value = {
          left: `${containerRect.left + (pos.x * zoom + pan.x) + 40}px`,
          top: `${containerRect.top + (pos.y * zoom + pan.y)}px`,
        };
        emit('nodeSelected', evt.target.data());
        tapTimer = null;
      }, 300); // 调整延时毫秒数以匹配双击间隔
    });

    // 节点右键菜单
    cy.on('cxttap', 'node', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // 选中节点
      selectedNode.value = evt.target;
      selectedEdge.value = null;
      selectedEdgeData.value = {};
      const data = { ...evt.target.data() };
      delete data.relationship;
      delete data.label;
      delete data.score;
      selectedNodeData.value = data;
      emit('nodeSelected', evt.target.data());

      // 显示右键菜单
      const pos = evt.renderedPosition;
      const containerRect = cyContainer.value?.getBoundingClientRect();
      if (!containerRect) return;
      showContextMenuAt(containerRect.left + pos.x, containerRect.top + pos.y, 'node');
    });

    cy.on('tap', 'edge', (evt) => {
      if (tapTimer) clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        selectedEdge.value = evt.target;
        selectedNode.value = null;
        selectedNodeData.value = {};
        // 创建边的元数据对象
        const data = { ...evt.target.data() };
        selectedEdgeData.value = data;
        // 计算元数据栏位置
        const midpoint = evt.target.midpoint();
        const containerRect = cyContainer.value?.getBoundingClientRect();
        if (!containerRect || !cy) return;
        const zoom = cy.zoom();
        const pan = cy.pan();
        edgeMetaPanelStyle.value = {
          left: `${containerRect.left + (midpoint.x * zoom + pan.x) + 40}px`,
          top: `${containerRect.top + (midpoint.y * zoom + pan.y)}px`,
        };
        emit('edgeSelected', evt.target.data());
        tapTimer = null;
      }, 300);
    });

    // 边右键菜单
    cy.on('cxttap', 'edge', (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      // 选中边
      selectedEdge.value = evt.target;
      selectedNode.value = null;
      selectedNodeData.value = {};
      const data = { ...evt.target.data() };
      selectedEdgeData.value = data;
      emit('edgeSelected', evt.target.data());

      // 显示右键菜单
      const pos = evt.renderedPosition;
      const containerRect = cyContainer.value?.getBoundingClientRect();
      if (!containerRect) return;
      showContextMenuAt(containerRect.left + pos.x, containerRect.top + pos.y, 'edge');
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        selectedNode.value = null;
        selectedNodeData.value = {};
        selectedEdge.value = null;
        selectedEdgeData.value = {};
        emit('nodeSelected', null);
        emit('edgeSelected', null);
        hideContextMenu();
      }
    });

    // 画布右键菜单
    cy.on('cxttap', (evt) => {
      if (evt.target === cy) {
        evt.preventDefault();
        evt.stopPropagation();

        // 清空选择
        selectedNode.value = null;
        selectedNodeData.value = {};
        selectedEdge.value = null;
        selectedEdgeData.value = {};
        emit('nodeSelected', null);
        emit('edgeSelected', null);

        // 显示画布右键菜单
        const pos = evt.renderedPosition;
        const containerRect = cyContainer.value?.getBoundingClientRect();
        if (!containerRect) return;
        showContextMenuAt(containerRect.left + pos.x, containerRect.top + pos.y, 'canvas');
      }
    });

    cy.on('dbltap', 'node', (evt) => {
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
      hideContextMenu();
      emit('nodeDblClick', evt.target.data());
    });
    cy.on('viewport', () => {
      hideContextMenu();
      if (cy) {
        emit('viewportChanged', cy.extent());
      }
    });
  });
});

// 点击其他地方隐藏右键菜单
document.addEventListener('click', hideContextMenu);

watch(
  () => props.elements,
  (newEls) => {
    if (cy) {
      cy.json({ elements: newEls });
      const layoutConfig = props.layout || {
        name: 'dagre',
        rankDir: 'BT',
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 80,
        fit: true,
        padding: 50,
      };
      cy.layout(layoutConfig).run();
    }
  },
);

// 暴露cy实例供父组件使用
defineExpose({
  cy: () => cy,
});
</script>

<style scoped>
.cytoscape-container {
  width: 100%;
  height: 70vh;
  background: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 2px 8px #e0e7ef;
  margin-bottom: 24px;
  position: relative;
}

.meta-panel {
  position: absolute;
  min-width: 220px;
  background: #fff;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
  box-shadow: 0 2px 8px #e0e7ef;
  padding: 16px;
  z-index: 10;
  top: 80px;
  left: 80px;
}

.context-menu {
  position: absolute;
  background: #fff;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background-color: #f5f5f5;
}

.context-menu-item:active {
  background-color: #e8e8e8;
}

.menu-icon {
  margin-right: 8px;
  width: 16px;
  text-align: center;
  font-weight: bold;
}

.context-menu-divider {
  height: 1px;
  background-color: #e0e7ef;
  margin: 4px 0;
}
</style>
