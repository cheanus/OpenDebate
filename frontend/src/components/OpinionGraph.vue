<template>
  <OpinionGraphCore
    v-bind="$props"
    @nodeArrowClick="(nodeId, direction) => $emit('nodeArrowClick', nodeId, direction)"
    @viewportChanged="(extent) => $emit('viewportChanged', extent)"
    @nodeSelected="(nodeData) => $emit('nodeSelected', nodeData)"
    @edgeSelected="(edgeData) => $emit('edgeSelected', edgeData)"
    @contextMenuAction="(action) => $emit('contextMenuAction', action)"
    @focusNode="(nodeId) => $emit('focusNode', nodeId)"
    ref="coreRef"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OpinionGraphCore from './OpinionGraph/OpinionGraphCore.vue';
import type { Element, GraphLayout, Node, Edge } from '@/types';

interface Props {
  elements: Array<Element>;
  layout?: GraphLayout;
  styleOptions?: Record<string, unknown>;
}

withDefaults(defineProps<Props>(), {
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
});

defineEmits<{
  nodeArrowClick: [nodeId: string, direction: 'children' | 'parents'];
  viewportChanged: [
    extent: { x1: number; y1: number; x2: number; y2: number; w: number; h: number },
  ];
  nodeSelected: [nodeData: Node | null];
  edgeSelected: [edgeData: Edge | null];
  contextMenuAction: [action: string];
  focusNode: [nodeId: string];
}>();

const coreRef = ref<InstanceType<typeof OpinionGraphCore>>();

// 暴露核心组件的方法
defineExpose({
  fitToView: () => coreRef.value?.fitToView?.(),
  centerOnNode: (nodeId: string) => coreRef.value?.centerOnNode?.(nodeId),
  refreshLayout: () => coreRef.value?.refreshLayout?.(),
});
</script>
