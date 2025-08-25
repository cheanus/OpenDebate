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
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useTheme } from 'vuetify';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Element, GraphLayout, Node, Edge } from '@/types';
import type { Core, NodeSingular, EdgeSingular } from 'cytoscape';

// 类型断言以避免cytoscape版本冲突
// eslint-disable-next-line @typescript-eslint/no-explicit-any
cytoscape.use(dagre as any); // dagre 插件类型定义与当前 cytoscape 版本存在兼容问题，暂时使用 any

interface Props {
  elements: Array<Element>; // [{ data: { id, label, ... }, classes: '' }, ...]
  layout?: GraphLayout;
  styleOptions?: Record<string, unknown>; // 样式配置对象，具体结构依赖于cytoscape
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
  viewportChanged: [
    extent: { x1: number; y1: number; x2: number; y2: number; w: number; h: number },
  ]; // cytoscape extent 对象
  nodeSelected: [nodeData: Node | null];
  edgeSelected: [edgeData: Edge | null];
  contextMenuAction: [action: string];
}>();

// 使用 Vuetify 主题
const theme = useTheme();

// 获取主题颜色的计算属性
const themeColors = computed(() => {
  const currentTheme = theme.current.value;
  return {
    andNodeColor: currentTheme.dark ? '#6C9AFF' : '#809fff',
    orNodeColor: currentTheme.dark ? '#FFB3E6' : '#ffafe7',
    textColor: currentTheme.dark ? '#FFFFFF' : '#222222',
    borderColor: currentTheme.dark ? '#777777' : '#bbbbbb',
    supportColor: currentTheme.colors.success,
    opposeColor: currentTheme.colors.error,
  };
});

const cyContainer = ref<HTMLElement | null>(null);
let cy: Core | null = null;
const selectedNode = ref<NodeSingular | null>(null);
const selectedNodeData = ref<Partial<Node>>({});
const selectedEdge = ref<EdgeSingular | null>(null);
const selectedEdgeData = ref<Partial<Edge>>({});
const metaPanelStyle = ref<Record<string, string>>({});
const edgeMetaPanelStyle = ref<Record<string, string>>({});
const showContextMenu = ref(false);
const contextMenuStyle = ref<Record<string, string>>({});
const contextMenuType = ref('');
// 新增延时定时器，兼容浏览器和 Node 环境
let tapTimer: ReturnType<typeof setTimeout> | null = null;

function getNodeSize(node: NodeSingular) {
  // 依据正证分、反证分平均值调整节点大小
  const pos = node.data('score') ? node.data('score').positive : null;
  const neg = node.data('score') ? node.data('score').negative : null;
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
    const colors = themeColors.value;
    
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
            'background-color': (
              ele: NodeSingular, // cytoscape 节点元素
            ) => (ele.data('logic_type') === 'and' ? colors.andNodeColor : colors.orNodeColor),
            label: (ele: NodeSingular) => wrapLabelText(ele.data('label'), getNodeSize(ele)),
            width: (ele: NodeSingular) => getNodeSize(ele),
            height: (ele: NodeSingular) => getNodeSize(ele),
            'font-size': 14,
            color: colors.textColor,
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': (ele: NodeSingular) => (ele.data('has_more_children') ? 6 : 0),
            'border-color': colors.borderColor,
            opacity: 0.95,
            'text-wrap': 'wrap',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 4,
            'line-color': (
              ele: EdgeSingular, // cytoscape 边元素
            ) => (ele.data('link_type') === 'supports' ? colors.supportColor : colors.opposeColor),
            'target-arrow-color': (ele: EdgeSingular) =>
              ele.data('link_type') === 'supports' ? colors.supportColor : colors.opposeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            opacity: 0.7,
          },
        },
      ],
    });
    // 绑定事件
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

// 监听主题变化并更新 Cytoscape 样式
watch(
  () => theme.global.name.value,
  () => {
    if (cy) {
      const colors = themeColors.value;
      cy.style([
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) =>
              ele.data('logic_type') === 'and' ? colors.andNodeColor : colors.orNodeColor,
            color: colors.textColor,
            'border-color': colors.borderColor,
          },
        },
        {
          selector: 'edge',
          style: {
            'line-color': (ele: EdgeSingular) =>
              ele.data('link_type') === 'supports' ? colors.supportColor : colors.opposeColor,
            'target-arrow-color': (ele: EdgeSingular) =>
              ele.data('link_type') === 'supports' ? colors.supportColor : colors.opposeColor,
          },
        },
      ]);
    }
  },
);

watch(
  () => props.elements,
  (newEls) => {
    if (cy) {
      // 保存当前的视窗状态
      const currentZoom = cy.zoom();
      const currentPan = cy.pan();

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

      // 运行布局
      const layout = cy.layout(layoutConfig);
      layout.run();

      // 如果layout配置中fit为false，则恢复之前的视窗状态
      if (!layoutConfig.fit) {
        layout.on('layoutstop', () => {
          if (cy) {
            cy.zoom(currentZoom);
            cy.pan(currentPan);
          }
        });
      }
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
  height: 100%;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(var(--v-theme-shadow));
  position: relative;
  overflow: hidden;
}

.meta-panel {
  position: absolute;
  min-width: 220px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  box-shadow: 0 4px 20px rgb(var(--v-theme-shadow));
  padding: 14px;
  z-index: 10;
  top: 80px;
  left: 80px;
  color: rgb(var(--v-theme-on-surface));
}

.meta-panel b {
  color: rgb(var(--v-theme-primary));
}

.context-menu {
  position: absolute;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  box-shadow: 0 8px 20px rgb(var(--v-theme-shadow));
  z-index: 1000;
  min-width: 150px;
  padding: 6px 0;
  color: rgb(var(--v-theme-on-surface));
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  transition:
    background-color 0.15s,
    color 0.15s;
}

.context-menu-item:hover {
  background-color: rgb(var(--v-theme-surface-bright));
  color: rgb(var(--v-theme-on-surface));
}

.context-menu-item:active {
  background-color: rgb(var(--v-theme-surface-container-high));
}

.menu-icon {
  margin-right: 8px;
  width: 16px;
  text-align: center;
  font-weight: bold;
  color: rgb(var(--v-theme-primary));
}

.context-menu-divider {
  height: 1px;
  background-color: rgb(var(--v-theme-outline));
  margin: 6px 0;
}

/* 小屏幕或极端缩放时保证面板可读 */
@media (max-width: 640px) {
  .meta-panel {
    min-width: 180px;
    padding: 10px;
  }
  .context-menu-item {
    padding: 8px 12px;
  }
}
</style>
