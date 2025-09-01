import { ref } from 'vue';
import { opinionService, linkService } from '@/services';
import type { LogicType, LinkType, Node as OpinionNode, Edge, UpdatedNodes } from '@/types';

/**
 * 图形 CRUD 操作
 */
export function useGraphCRUD(
  debateId: string,
  loading: ReturnType<typeof ref<boolean>>,
  error: ReturnType<typeof ref<string | null>>,
  refreshView: () => Promise<void>,
  removeNode: (nodeId: string) => void,
  removeEdge: (edgeId: string) => void,
  addNode: (node: OpinionNode, hasMoreChildren?: boolean | null, hasMoreParents?: boolean | null) => void,
  addEdge: (edge: Edge) => void,
  refreshOpinions: (updatedNodes: UpdatedNodes) => void,
  loadedNodes: ReturnType<typeof ref<Set<string>>>,
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
      let response, ANDNodeData;
      if (data.logic_type === 'and') {
        response = await opinionService.createAnd({
          parent_id: data.parent_id!,
          son_ids: data.son_ids!,
          link_type: data.link_type!,
          creator: data.creator,
          debate_id: debateId,
          loaded_ids: Array.from(loadedNodes.value!),
        });
        ANDNodeData = response.data;
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
        // 获取新创建的观点信息并添加到视图中
        try {
          const newOpinionId = response.data.node_id;
          const opinionInfoResponse = await opinionService.getInfo(newOpinionId, debateId);

          if (opinionInfoResponse.is_success && opinionInfoResponse.data) {
            const newOpinion = opinionInfoResponse.data;

            // 将新观点添加到视图中
            addNode(newOpinion);

            // 如果是与观点，还需要创建相应的连接
            if (data.logic_type === 'and' && data.parent_id && data.son_ids) {
              if (!ANDNodeData) {
                throw new Error('缺少 AND 节点数据');
              }
              // 创建父节点到新节点的连接
              if (addEdge) {
                const parentEdge: Edge = {
                  id: ANDNodeData.link_ids[0],
                  from_id: data.parent_id,
                  to_id: newOpinionId,
                  link_type: data.link_type!,
                };
                addEdge(parentEdge);
              }

              // 创建新节点到子节点的连接
              if (addEdge) {
                for (let i = 0; i < data.son_ids.length; i++) {
                  const childEdge: Edge = {
                    id: ANDNodeData.link_ids[i],
                    from_id: newOpinionId,
                    to_id: data.son_ids[i],
                    link_type: data.link_type!,
                  };
                  addEdge(childEdge);
                }
              }

              // 更新受影响的点分数
              refreshOpinions(ANDNodeData.updated_nodes);
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
        loaded_ids: Array.from(loadedNodes.value!),
      });

      if (response.is_success) {
        refreshOpinions(response.data?.updated_nodes || {});
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
      const response = await opinionService.delete({
        opinion_id: opinionId,
        debate_id: debateId,
        loaded_ids: Array.from(loadedNodes.value!),
      });

      if (response.is_success) {
        // 从本地状态中移除节点
        removeNode(opinionId);
        refreshOpinions(response.data?.updated_nodes || {});
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
  const createLink = async (data: { from_id: string; to_id: string; link_type: LinkType }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.create({
        from_id: data.from_id,
        to_id: data.to_id,
        link_type: data.link_type,
        loaded_ids: Array.from(loadedNodes.value!),
      });

      if (response.is_success && response.data) {
        // 添加新连接到视图中
        try {
          const newLinkId = response.data.id || `${data.from_id}-${data.to_id}`;
          const newEdge: Edge = {
            id: newLinkId,
            from_id: data.from_id,
            to_id: data.to_id,
            link_type: data.link_type,
          };

          addEdge(newEdge);
          refreshOpinions(response.data?.updated_nodes);
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
  const updateLink = async (data: { id: string; link_type: LinkType }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.update({
        link_id: data.id,
        link_type: data.link_type,
        loaded_ids: Array.from(loadedNodes.value!),
      });

      if (response.is_success) {
        // 更新受影响的节点分数
        refreshOpinions(response.data?.updated_nodes || {});
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
        loaded_ids: Array.from(loadedNodes.value!),
      });
      if (response.is_success) {
        // 从本地状态中移除连接
        removeEdge(linkId);
        refreshOpinions(response.data?.updated_nodes || {});
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

  // 质疑连接
  const attackLink = async (linkId: string) => {
    loading.value = true;
    error.value = null;

    try {
      // 提前获取 from_node、to_node
      const old_link = (await linkService.getInfo(linkId)).data
      const from_node_id = old_link?.from_id;
      const to_node_id = old_link?.to_id;
      const response = await linkService.attack({
        link_id: linkId,
        debate_id: debateId,
      });
      if (!response.is_success || !response.data) {
        throw new Error(response.msg || '质疑连接失败');
      }
      // 添加2个新点
      const or_node = (await opinionService.getInfo(response.data.or_id, debateId)).data;
      const and_node = (await opinionService.getInfo(response.data.and_id, debateId)).data;
      // 删除原链
      removeEdge(linkId);
      if (!or_node || !and_node || !from_node_id || !to_node_id) {
        throw new Error('获取质疑产生的新观点失败');
      }
      addNode(or_node, false, false);
      addNode(and_node, false, false);
      // 添加3个新链
      addEdge({
        id: response.data.link_ids[0],
        from_id: and_node.id,
        to_id: to_node_id,
        link_type: 'supports',
      });
      addEdge({
        id: response.data.link_ids[1],
        from_id: from_node_id,
        to_id: and_node.id,
        link_type: 'supports',
      });
      addEdge({
        id: response.data.link_ids[2],
        from_id: or_node.id,
        to_id: and_node.id,
        link_type: 'supports',
      });
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '质疑连接失败';
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
    attackLink,
  };
}
