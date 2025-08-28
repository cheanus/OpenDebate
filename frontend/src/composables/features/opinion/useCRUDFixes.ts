import { ref, type Ref } from 'vue';
import { useNotifications } from '@/composables';
import type { Element } from '@/types';

/**
 * CRUD 操作修复和优化
 * 解决空辩论新建观点后不显示和删除观点后仍显示的问题
 */
export function useCRUDFixes(
  elements: Ref<Element[]>,
  loadedNodes: Ref<Set<string>>,
  loadedEdges: Ref<Set<string>>,
  refreshView: () => Promise<void>
) {
  const { notifySuccess, notifyError } = useNotifications();
  const isUpdating = ref(false);

  /**
   * 确保节点被正确添加到视图中
   * 特别处理空辩论的情况
   */
  const ensureNodeVisibility = async (nodeId: string) => {
    // 检查节点是否已经在视图中
    if (loadedNodes.value.has(nodeId)) {
      console.log('[ensureNodeVisibility] 节点已存在:', nodeId);
      return true;
    }

    // 如果当前视图为空（空辩论），刷新整个视图以确保显示
    if (elements.value.length === 0) {
      console.log('[ensureNodeVisibility] 空视图，刷新以显示新节点');
      await refreshView();
      return loadedNodes.value.has(nodeId);
    }

    console.log('[ensureNodeVisibility] 节点未在视图中找到:', nodeId);
    return false;
  };

  /**
   * 确保节点被正确从视图中移除
   * 处理可能的同步问题
   */
  const ensureNodeRemoval = async (nodeId: string, maxRetries = 3) => {
    let retries = 0;
    
    while (retries < maxRetries && (loadedNodes.value.has(nodeId) || elements.value.some(el => el.data && el.data.id === nodeId))) {
      console.log(`[ensureNodeRemoval] 尝试移除节点 ${nodeId}, 重试 ${retries + 1}/${maxRetries}`);
      
      // 统计移除前的状态
      elements.value = elements.value.filter((el) => {
        // 移除节点本身
        if (el.data && el.data.id === nodeId) {
          console.log('[ensureNodeRemoval] 移除节点:', nodeId);
          return false;
        }
        // 移除相关的边
        if (el.data && ('source' in el.data || 'target' in el.data)) {
          const linkData = el.data as unknown as { id: string; source: string; target: string };
          if (linkData.source === nodeId || linkData.target === nodeId) {
            console.log('[ensureNodeRemoval] 移除相关边:', linkData.id);
            loadedEdges.value.delete(linkData.id);
            return false;
          }
        }
        return true;
      });
      
      loadedNodes.value.delete(nodeId);

      // 等待一小段时间以确保 UI 更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      retries++;
    }

    // 检查最终状态
    const finalNodeInLoadedNodes = loadedNodes.value.has(nodeId);
    const finalNodeInElements = elements.value.some(el => el.data && el.data.id === nodeId);
    
    // 如果仍然存在，强制刷新视图
    if (finalNodeInLoadedNodes || finalNodeInElements) {
      console.warn('[ensureNodeRemoval] 节点仍存在，强制刷新视图');
      await refreshView();
    }

    return !loadedNodes.value.has(nodeId) && !elements.value.some(el => el.data && el.data.id === nodeId);
  };

  /**
   * 确保边被正确从视图中移除
   */
  const ensureEdgeRemoval = async (edgeId: string, maxRetries = 3) => {
    let retries = 0;
    
    while (retries < maxRetries && loadedEdges.value.has(edgeId)) {
      console.log(`[ensureEdgeRemoval] 尝试移除边 ${edgeId}, 重试 ${retries + 1}/${maxRetries}`);
      
      elements.value = elements.value.filter((el) => {
        if (el.data && el.data.id === edgeId) {
          console.log('[ensureEdgeRemoval] 移除边:', edgeId);
          return false;
        }
        return true;
      });
      
      loadedEdges.value.delete(edgeId);
      
      // 等待一小段时间以确保 UI 更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      retries++;
    }

    // 如果仍然存在，强制刷新视图
    if (loadedEdges.value.has(edgeId)) {
      console.warn('[ensureEdgeRemoval] 边仍存在，强制刷新视图');
      await refreshView();
    }

    return !loadedEdges.value.has(edgeId);
  };

  /**
   * 包装 CRUD 操作以提供一致的错误处理和状态管理
   */
  const wrapCRUDOperation = async <T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    postOperation?: () => Promise<void>
  ): Promise<T | null> => {
    if (isUpdating.value) {
      console.warn('[wrapCRUDOperation] 操作正在进行中，忽略重复请求');
      return null;
    }

    isUpdating.value = true;
    
    try {
      const result = await operation();
      
      // 检查操作结果，null 或 false 表示操作失败
      if (result === null || result === false) {
        console.error('[wrapCRUDOperation] 操作返回失败结果:', result);
        notifyError(errorMessage);
        return null;
      }
      
      if (postOperation) {
        await postOperation();
      }
      
      notifySuccess(successMessage);
      return result;
    } catch (error) {
      console.error('[wrapCRUDOperation] 操作异常:', error);
      notifyError(errorMessage);
      return null;
    } finally {
      isUpdating.value = false;
    }
  };

  return {
    ensureNodeVisibility,
    ensureNodeRemoval,
    ensureEdgeRemoval,
    wrapCRUDOperation,
    isUpdating,
  };
}
