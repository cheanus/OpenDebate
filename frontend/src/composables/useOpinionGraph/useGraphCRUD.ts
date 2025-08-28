import { ref } from 'vue';
import { opinionService, linkService } from '@/services';
import type { LogicType, LinkType, Node as OpinionNode, Edge } from '@/types';

/**
 * 图形 CRUD 操作
 */
export function useGraphCRUD(
  debateId: string,
  loading: ReturnType<typeof ref<boolean>>,
  error: ReturnType<typeof ref<string | null>>,
  refreshView: () => Promise<void>,
  removeNode?: (nodeId: string) => void,
  removeEdge?: (edgeId: string) => void,
  addNode?: (node: OpinionNode) => Promise<void>,
  addEdge?: (edge: Edge) => void
) {
  
  // 创建观点
  const createOpinion = async (data: {
    logic_type: LogicType;
    content?: string;
    parent_id?: string;
    son_ids?: string[];
    link_type?: LinkType;
    positive_score?: number | null;
    is_llm_score?: boolean;
    creator: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      let response;
      if (data.logic_type === 'and') {
        response = await opinionService.createAnd({
          parent_id: data.parent_id!,
          son_ids: data.son_ids!,
          link_type: data.link_type!,
          creator: data.creator,
          debate_id: debateId,
        });
      } else {
        response = await opinionService.createOr({
          content: data.content!,
          positive_score: data.positive_score,
          is_llm_score: data.is_llm_score,
          creator: data.creator,
          debate_id: debateId,
        });
      }

      if (response.is_success && response.data) {
        // 获取新创建的观点信息并添加到视图中，而不是刷新整个视图
        try {
          const newOpinionId = response.data.id;
          const opinionInfoResponse = await opinionService.getInfo(newOpinionId, debateId);
          
          if (opinionInfoResponse.is_success && opinionInfoResponse.data) {
            const newOpinion = opinionInfoResponse.data;
            
            // 将新观点添加到视图中
            if (addNode) {
              await addNode(newOpinion);
            }
            
            // 如果是与观点，还需要创建相应的连接
            if (data.logic_type === 'and' && data.parent_id && data.son_ids) {
              // 创建父节点到新节点的连接
              if (addEdge) {
                const parentEdge: Edge = {
                  id: `${data.parent_id}-${newOpinionId}`,
                  from_id: data.parent_id,
                  to_id: newOpinionId,
                  link_type: data.link_type!,
                  is_success: true,
                  msg: null
                };
                addEdge(parentEdge);
              }
              
              // 创建新节点到子节点的连接
              if (addEdge) {
                for (const sonId of data.son_ids) {
                  const childEdge: Edge = {
                    id: `${newOpinionId}-${sonId}`,
                    from_id: newOpinionId,
                    to_id: sonId,
                    link_type: data.link_type!,
                    is_success: true,
                    msg: null
                  };
                  addEdge(childEdge);
                }
              }
            }
            
            return response.data;
          } else {
            // 如果获取新观点信息失败，回退到刷新视图
            console.warn('获取新创建观点信息失败，回退到刷新视图');
            await refreshView();
            return response.data;
          }
        } catch (err) {
          console.error('处理新创建观点失败，回退到刷新视图:', err);
          await refreshView();
          return response.data;
        }
      } else {
        error.value = response.msg || '创建观点失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建观点失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 更新观点
  const updateOpinion = async (data: {
    id: string;
    content?: string;
    positive_score?: number | null;
    is_llm_score?: boolean;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await opinionService.update({
        id: data.id,
        content: data.content,
        score: data.positive_score !== undefined ? { positive: data.positive_score } : undefined,
        is_llm_score: data.is_llm_score,
      });

      if (response.is_success) {
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '更新观点失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新观点失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 删除观点
  const deleteOpinion = async (opinionId: string) => {
    console.log('[deleteOpinion] 开始删除观点:', opinionId);
    loading.value = true;
    error.value = null;

    try {
      console.log('[deleteOpinion] 调用 API 删除观点');
      const response = await opinionService.delete({
        opinion_id: opinionId,
        debate_id: debateId,
      });
      
      console.log('[deleteOpinion] API 响应:', response);
      
      if (response.is_success) {
        console.log('[deleteOpinion] 删除成功，移除节点');
        // 直接从本地状态中移除节点而不是刷新整个视图
        if (removeNode) {
          removeNode(opinionId);
        } else {
          // 回退到刷新视图
          await refreshView();
        }
        return true;
      } else {
        console.error('[deleteOpinion] 删除失败:', response.msg);
        error.value = response.msg || '删除观点失败';
        return false;
      }
    } catch (err) {
      console.error('[deleteOpinion] 删除异常:', err);
      error.value = err instanceof Error ? err.message : '删除观点失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 创建连接
  const createLink = async (data: {
    from_id: string;
    to_id: string;
    link_type: LinkType;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.create({
        from_id: data.from_id,
        to_id: data.to_id,
        link_type: data.link_type,
      });

      if (response.is_success && response.data) {
        // 直接添加新连接到视图中，而不是刷新整个视图
        try {
          const newLinkId = response.data.id || `${data.from_id}-${data.to_id}`;
          const newEdge: Edge = {
            id: newLinkId,
            from_id: data.from_id,
            to_id: data.to_id,
            link_type: data.link_type,
            is_success: true,
            msg: null
          };
          
          if (addEdge) {
            addEdge(newEdge);
          } else {
            // 回退到刷新视图
            await refreshView();
          }
          
          return response.data;
        } catch (err) {
          console.error('处理新创建连接失败，回退到刷新视图:', err);
          await refreshView();
          return response.data;
        }
      } else {
        console.error('[createLink] 创建连接失败:', response.msg);
        error.value = response.msg || '创建连接失败';
        return null;
      }
    } catch (err) {
      console.error('[createLink] 创建连接异常:', err);
      error.value = err instanceof Error ? err.message : '创建连接失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 更新连接
  const updateLink = async (data: {
    id: string;
    link_type: LinkType;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.update({
        link_id: data.id,
        link_type: data.link_type,
      });

      if (response.is_success) {
        // 对于连接更新，通常只是类型改变，可以直接更新本地状态
        // 但为了简单起见，这里仍然使用刷新视图
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '更新连接失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新连接失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 删除连接
  const deleteLink = async (linkId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.delete({
        link_id: linkId,
      });
      if (response.is_success) {
        // 直接从本地状态中移除连接而不是刷新整个视图
        if (removeEdge) {
          removeEdge(linkId);
        } else {
          // 回退到刷新视图
          await refreshView();
        }
        return true;
      } else {
        error.value = response.msg || '删除连接失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除连接失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    createOpinion,
    updateOpinion,
    deleteOpinion,
    createLink,
    updateLink,
    deleteLink,
  };
}
