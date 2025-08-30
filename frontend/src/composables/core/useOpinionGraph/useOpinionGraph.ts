import { useGraphState } from './useGraphState';
import { useGraphSearch } from './useGraphSearch';
import { useGraphSettings } from './useGraphSettings';
import { useGraphElements } from './useGraphElements';
import { useGraphOperations } from './useGraphOperations';
import { useGraphCRUD } from './useGraphCRUD';

/**
 * 主要的观点图组合函数
 * 整合了状态管理、搜索、设置、元素管理和操作功能
 */
export function useOpinionGraph(debateId: string) {
  // 基础状态管理
  const {
    elements,
    loadedNodes,
    loadedEdges,
    loading,
    error,
    selectedNode,
    selectedEdge,
    clearState,
    setLoading,
    setError,
    setSelectedNode,
    setSelectedEdge,
  } = useGraphState();

  // 搜索功能
  const { searchQuery, searchOpinions, searchLoading, searchOpinionsApi, clearSearch } =
    useGraphSearch(debateId);

  // 设置管理
  const {
    maxUpdatedSon,
    numClickUpdatedSon,
    loadDepth,
    loadSettings,
    saveSettings,
    resetSettings,
  } = useGraphSettings();

  // 元素管理
  const {
    availableNodes,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    updateNodeHasMoreState,
    updateNodeArrowsState,
    refreshOpinions,
  } = useGraphElements(elements, loadedNodes, loadedEdges);

  // 图形操作
  const { loadChildren, loadParents, focusOnOpinion, loadRootNodes } = useGraphOperations(
    debateId,
    addNode,
    addEdge,
    updateNodeHasMoreState,
    updateNodeArrowsState,
    loadedNodes,
    numClickUpdatedSon,
  );

  // 处理节点箭头点击
  const handleNodeArrowClick = async (nodeId: string, direction: 'children' | 'parents') => {
    try {
      setLoading(true);
      setError(null);

      if (direction === 'children') {
        await loadChildren(nodeId, numClickUpdatedSon.value, loadDepth.value);
      } else {
        await loadParents(nodeId, numClickUpdatedSon.value, loadDepth.value);
      }
    } catch (err) {
      console.error('加载节点失败:', err);
      setError('加载节点失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 初始化图形
  const initializeGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      clearState();
      loadSettings();

      await loadRootNodes(maxUpdatedSon.value);
    } catch (err) {
      console.error('初始化图形失败:', err);
      setError('初始化图形失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索并定位到观点
  const searchAndFocusOpinion = async (opinionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const success = await focusOnOpinion(opinionId, maxUpdatedSon.value);
      if (!success) {
        setError('无法定位到该观点');
      }
    } catch (err) {
      console.error('定位观点失败:', err);
      setError('定位观点失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 刷新视图
  const refreshView = async () => {
    try {
      clearState();
      await loadRootNodes(maxUpdatedSon.value);
    } catch (err) {
      console.error('刷新视图失败:', err);
      setError('刷新视图失败，请重试');
    }
  };

  // CRUD 操作
  const { createOpinion, updateOpinion, deleteOpinion, createLink, updateLink, deleteLink } =
    useGraphCRUD(
      debateId,
      loading,
      error,
      refreshView,
      removeNode,
      removeEdge,
      addNode,
      addEdge,
      refreshOpinions,
      loadedNodes,
    );

  return {
    // 状态
    elements,
    loadedNodes,
    loadedEdges,
    loading,
    error,
    selectedNode,
    selectedEdge,

    // 搜索
    searchQuery,
    searchOpinions,
    searchLoading,

    // 设置
    maxUpdatedSon,
    numClickUpdatedSon,
    loadDepth,

    // 计算属性
    availableNodes,

    // 基础操作
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    updateNodeHasMoreState,

    // 高级操作
    handleNodeArrowClick,
    initializeGraph,
    searchAndFocusOpinion,
    refreshView,

    // CRUD 操作
    createOpinion,
    updateOpinion,
    deleteOpinion,
    createLink,
    updateLink,
    deleteLink,

    // 设置操作
    loadSettings,
    saveSettings,
    resetSettings,

    // 搜索操作
    searchOpinionsApi,
    clearSearch,

    // 状态操作
    clearState,
    setLoading,
    setError,
    setSelectedNode,
    setSelectedEdge,
  };
}
