import { ref } from 'vue';
import type { Node, Element, Edge } from '@/types';

/**
 * 图形状态管理
 */
export function useGraphState() {
  // 状态
  const elements = ref<Element[]>([]);
  const loadedNodes = ref<Set<string>>(new Set());
  const loadedEdges = ref<Set<string>>(new Set());
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 选中状态
  const selectedNode = ref<Node | null>(null);
  const selectedEdge = ref<Edge | null>(null);

  // 清空状态
  const clearState = () => {
    elements.value = [];
    loadedNodes.value.clear();
    loadedEdges.value.clear();
    selectedNode.value = null;
    selectedEdge.value = null;
    error.value = null;
  };

  // 设置加载状态
  const setLoading = (isLoading: boolean) => {
    loading.value = isLoading;
  };

  // 设置错误状态
  const setError = (errorMessage: string | null) => {
    error.value = errorMessage;
  };

  // 设置选中的节点
  const setSelectedNode = (node: Node | null) => {
    selectedNode.value = node;
  };

  // 设置选中的边
  const setSelectedEdge = (edge: Edge | null) => {
    selectedEdge.value = edge;
  };

  return {
    // 状态
    elements,
    loadedNodes,
    loadedEdges,
    loading,
    error,
    selectedNode,
    selectedEdge,
    // 方法
    clearState,
    setLoading,
    setError,
    setSelectedNode,
    setSelectedEdge,
  };
}
