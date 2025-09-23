<template>
  <div class="cytoscape-wrapper">
    <div ref="cyContainer" class="cytoscape-container" @contextmenu.prevent></div>

    <!-- 节点箭头覆盖层 -->
    <div class="arrows-overlay" ref="arrowsOverlay">
      <div
        v-for="node in nodesWithArrows"
        :key="node.id"
        class="node-arrows"
        :style="node.style"
        :class="{
          'show-arrows': node.showArrows,
          'small-arrows': node.style['data-size'] === 'small',
          'medium-arrows': node.style['data-size'] === 'medium',
          'large-arrows': node.style['data-size'] === 'large',
        }"
        :data-size="node.style['data-size']"
      >
        <div
          v-if="node.hasParentsArrow"
          class="arrow arrow-up"
          @click.stop="handleArrowClick(node.id, 'parents')"
          :title="'加载更多父观点'"
        >
          ▲
        </div>
        <div
          v-if="node.hasChildrenArrow"
          class="arrow arrow-down"
          @click.stop="handleArrowClick(node.id, 'children')"
          :title="'加载更多子观点'"
        >
          ▼
        </div>
      </div>
    </div>
  </div>

  <!-- 节点元数据面板 -->
  <div v-if="isShowNodePanel" class="meta-panel" :style="metaPanelStyle">
    <h3>节点元数据</h3>
    <div v-for="(v, k) in selectedNodeData" :key="k">
      <b>{{ k }}:</b> {{ v }}
    </div>
  </div>

  <!-- 边元数据面板 -->
  <div v-if="isShowEdgePanel" class="meta-panel" :style="edgeMetaPanelStyle">
    <h3>连接元数据</h3>
    <div v-for="(v, k) in selectedEdgeData" :key="k">
      <b>{{ k }}:</b> {{ v }}
    </div>
  </div>

  <!-- 右键菜单 -->
  <ContextMenu
    v-if="showContextMenu"
    :style="contextMenuStyle"
    :type="contextMenuType"
    @action="handleMenuAction"
    @click.stop
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import { useTheme } from 'vuetify';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { Element, GraphLayout, Node, Edge } from '@/types';
import type { Core, StylesheetStyle } from 'cytoscape';

import { getCytoscapeStyles } from './cytoscapeStyles';
import { useNodeArrows } from '@/composables/features/graph/useNodeArrows';
import { useContextMenu } from '@/composables/ui/useContextMenu';
import { useCytoscapeManager } from './cytoscapeUtils';
import ContextMenu from './ContextMenu.vue';

// 类型断言以避免cytoscape版本冲突
// eslint-disable-next-line @typescript-eslint/no-explicit-any
cytoscape.use(dagre as any);

interface Props {
  elements: Array<Element>;
  layout?: GraphLayout;
  styleOptions?: Record<string, unknown>;
  isInNodeSelectionMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  elements: () => [],
  layout: () => ({
    name: 'dagre',
    rankDir: 'BT',
    nodeSep: 50,
    edgeSep: 10,
    rankSep: 80,
    fit: false, // 加载节点时不适配屏幕
    padding: 50,
  }),
  styleOptions: () => ({}),
  isInNodeSelectionMode: false,
});

const emit = defineEmits<{
  nodeArrowClick: [nodeId: string, direction: 'children' | 'parents'];
  viewportChanged: [
    extent: { x1: number; y1: number; x2: number; y2: number; w: number; h: number },
  ];
  nodeSelected: [nodeData: Node | null];
  edgeSelected: [edgeData: Edge | null];
  contextMenuAction: [action: string];
  focusNode: [nodeId: string];
}>();

// 使用 Vuetify 主题
const theme = useTheme();

// 获取主题颜色的计算属性
const themeColors = computed(() => {
  const currentTheme = theme.current.value;

  return {
    andNodeColor: currentTheme.dark ? '#2e7d32' : '#66bb6a',
    orNodeColor: currentTheme.dark ? '#1976d2' : '#42a5f5',
    textColor: currentTheme.dark ? '#ffffff' : '#000000',
    borderColor: currentTheme.dark ? '#777777' : '#bbbbbb',
    supportColor: currentTheme.dark ? '#4caf50' : '#2e7d32',
    opposeColor: currentTheme.dark ? '#f44336' : '#c62828',
    mixedBorderColor: currentTheme.dark ? '#ff9800' : '#f57c00',
    parentBorderColor: currentTheme.dark ? '#9c27b0' : '#7b1fa2',
    childBorderColor: currentTheme.dark ? '#00bcd4' : '#0097a7',
  };
});

// DOM 引用
const cyContainer = ref<HTMLElement | null>(null);
const arrowsOverlay = ref<HTMLElement | null>(null);

// Cytoscape 实例
let cy: Core | null = null;
// 元数据面板显示变量
const isShowNodePanel = ref(false);
const isShowEdgePanel = ref(false);

// 使用组合函数
const { nodesWithArrows, showNodeArrows, hideNodeArrows, updateArrowsPosition } = useNodeArrows();

const {
  showContextMenu,
  contextMenuStyle,
  contextMenuType,
  selectedNodeData,
  selectedEdgeData,
  metaPanelStyle,
  edgeMetaPanelStyle,
  setContextMenu,
  hideContextMenu,
  setSelectedNode,
  setSelectedEdge,
} = useContextMenu();

const { initializeCytoscape, updateElements, fitToView, centerOnNode, refreshLayout } =
  useCytoscapeManager();

// 处理箭头点击事件
const handleArrowClick = (nodeId: string, direction: 'children' | 'parents') => {
  emit('nodeArrowClick', nodeId, direction);
};

// 处理菜单动作
const handleMenuAction = (action: string) => {
  hideContextMenu();
  emit('contextMenuAction', action);
};

// 初始化 Cytoscape
const initGraph = () => {
  if (!cyContainer.value) return;

  const styles = getCytoscapeStyles(themeColors.value);

  cy = initializeCytoscape(
    cyContainer.value,
    props.elements,
    props.layout,
    styles as StylesheetStyle[], // 类型断言以避免复杂的cytoscape类型冲突
  );

  // 事件监听
  setupEventListeners();
};

// 设置事件监听
const setupEventListeners = () => {
  if (!cy) return;

  // 节点点击事件
  cy.on('tap', 'node', (evt) => {
    const node = evt.target;
    const renderedPos = node.renderedPosition();

    setSelectedNode(node, renderedPos);
    setSelectedEdge(null);

    // 在节点选择模式下不显示元数据面板
    if (!props.isInNodeSelectionMode) {
      isShowNodePanel.value = true;
      isShowEdgePanel.value = false;
    }
    hideContextMenu();

    emit('nodeSelected', node.data());
  });

  // 边点击事件
  cy.on('tap', 'edge', (evt) => {
    const edge = evt.target;
    const renderedPos = edge.renderedMidpoint();

    setSelectedEdge(edge, renderedPos);
    setSelectedNode(null);

    // 在节点选择模式下不显示元数据面板
    if (!props.isInNodeSelectionMode) {
      isShowEdgePanel.value = true;
      isShowNodePanel.value = false;
    }
    hideContextMenu();

    emit('edgeSelected', edge.data());
  });

  // 空白区域点击事件
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      setSelectedNode(null);
      setSelectedEdge(null);
      // 在节点选择模式下不操作元数据面板
      if (!props.isInNodeSelectionMode) {
        isShowNodePanel.value = false;
        isShowEdgePanel.value = false;
      }
      hideContextMenu();
      emit('nodeSelected', null);
      emit('edgeSelected', null);
    }
  });

  // 节点右键菜单
  cy.on('cxttap', 'node', (evt) => {
    // 在节点选择模式下禁用右键菜单
    if (props.isInNodeSelectionMode) {
      return;
    }

    evt.stopPropagation();
    const node = evt.target;
    const pos = evt.renderedPosition || evt.position;

    // 设置选中的节点
    setSelectedNode(node, { x: pos.x, y: pos.y });
    setSelectedEdge(null);

    // 取消元数据面板
    isShowNodePanel.value = false;
    isShowEdgePanel.value = false;

    // 设置右键菜单
    setContextMenu(pos.x, pos.y, 'node');

    // 通知父组件
    emit('nodeSelected', node.data());
  });

  // 边右键菜单
  cy.on('cxttap', 'edge', (evt) => {
    // 在节点选择模式下禁用右键菜单
    if (props.isInNodeSelectionMode) {
      return;
    }

    evt.stopPropagation();
    const edge = evt.target;
    const pos = evt.renderedPosition || evt.position;

    // 设置选中的边
    setSelectedEdge(edge, { x: pos.x, y: pos.y });
    setSelectedNode(null);

    // 取消元数据面板
    isShowNodePanel.value = false;
    isShowEdgePanel.value = false;

    // 设置右键菜单
    setContextMenu(pos.x, pos.y, 'edge');

    // 通知父组件
    emit('edgeSelected', edge.data());
  });

  // 空白区域右键菜单
  cy.on('cxttap', (evt) => {
    // 在节点选择模式下禁用右键菜单
    if (props.isInNodeSelectionMode) {
      return;
    }

    // 取消元数据面板
    isShowNodePanel.value = false;
    isShowEdgePanel.value = false;
    if (evt.target === cy) {
      const pos = evt.renderedPosition || evt.position;
      setContextMenu(pos.x, pos.y, 'canvas');
    }
  });

  // 节点悬停事件
  cy.on('mouseover', 'node', (evt) => {
    const node = evt.target;
    showNodeArrows(node.id());
  });

  cy.on('mouseout', 'node', (evt) => {
    const node = evt.target;
    hideNodeArrows(node.id());
  });

  // 视口变化事件
  cy.on('viewport', () => {
    updateArrowsPosition(cy, props.elements, cyContainer.value);

    const extent = cy!.extent();
    emit('viewportChanged', extent);
  });

  // 布局完成事件
  cy.on('layoutstop', () => {
    nextTick(() => {
      updateArrowsPosition(cy, props.elements, cyContainer.value);
    });
  });
};

// 监听元素变化
watch(
  () => props.elements,
  (newElements) => {
    if (cy) {
      // 保存当前的视窗状态
      const currentZoom = cy.zoom();
      const currentPan = cy.pan();

      updateElements(cy, newElements);

      // 取消元数据面板和右键菜单
      setSelectedNode(null);
      setSelectedEdge(null);
      hideContextMenu();

      // 运行布局
      const layout = cy.layout(props.layout);
      layout.run();

      // 如果layout配置中fit为false，则恢复之前的视窗状态
      if (props.layout && 'fit' in props.layout && !props.layout.fit) {
        layout.on('layoutstop', () => {
          if (cy) {
            cy.zoom(currentZoom);
            cy.pan(currentPan);
          }
        });
      }

      // 布局完成后更新箭头位置
      layout.on('layoutstop', () => {
        nextTick(() => {
          updateArrowsPosition(cy, props.elements, cyContainer.value);
        });
      });
    }
  },
  { deep: true },
);

// 监听主题变化
watch(themeColors, () => {
  if (cy) {
    const styles = getCytoscapeStyles(themeColors.value);
    cy.style(styles as StylesheetStyle[]); // 使用正确的类型断言
  }
});

// 监听节点选择模式变化
watch(() => props.isInNodeSelectionMode, (isInSelectionMode) => {
  if (!isInSelectionMode) {
    // 退出节点选择模式时，隐藏所有面板和菜单
    isShowNodePanel.value = false;
    isShowEdgePanel.value = false;
    hideContextMenu();
  }
});

// 暴露方法给父组件
defineExpose({
  fitToView: () => cy && fitToView(cy),
  centerOnNode: (nodeId: string) => cy && centerOnNode(cy, nodeId),
  refreshLayout: () => cy && refreshLayout(cy, props.layout),
});

onMounted(() => {
  initGraph();
});
</script>

<style src="./styles.css" scoped></style>
