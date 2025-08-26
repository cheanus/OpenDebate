import { ref, computed, watch } from 'vue';
import { opinionService, linkService } from '@/services';
import { APP_CONFIG } from '@/config';
import type { Node, Element, Edge, LogicType, LinkType } from '@/types';

export function useOpinionGraph(debateId: string) {
  // 状态
  const elements = ref<Element[]>([]);
  const loadedNodes = ref<Set<string>>(new Set());
  const loadedEdges = ref<Set<string>>(new Set());
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 选中状态
  const selectedNode = ref<Node | null>(null);
  const selectedEdge = ref<Edge | null>(null);
  
  // 搜索状态
  const searchQuery = ref<string>('');
  const searchOpinions = ref<Node[]>([]);
  const searchLoading = ref(false);

  // 设置
  const maxUpdatedSon = ref(APP_CONFIG.defaults.maxUpdatedSon);
  const numClickUpdatedSon = ref(APP_CONFIG.defaults.numClickUpdatedSon);
  const loadDepth = ref(APP_CONFIG.defaults.loadDepth);

  // 计算属性
  const availableNodes = computed(() => {
    return elements.value
      .filter((el) => el.data && el.data.id && 'content' in el.data)
      .map((el) => el.data) as Node[];
  });

  // 更新节点箭头状态 - 检查已加载的相邻节点
  const updateNodeArrowsState = async (nodeId: string) => {
    try {
      const response = await opinionService.getInfo(nodeId, debateId);
      if (!response.is_success || !response.data) return;

      const rel = response.data.relationship;
      
      // 检查父节点：如果所有父节点都已加载，则不显示上箭头
      const parentLinks = [...(rel.supports || []), ...(rel.opposes || [])];
      let hasUnloadedParents = false;
      
      for (const linkId of parentLinks) {
        try {
          const linkResponse = await linkService.getInfo(linkId);
          if (linkResponse.is_success && linkResponse.to_id) {
            const parentId = linkResponse.to_id as string;
            if (!loadedNodes.value.has(parentId)) {
              hasUnloadedParents = true;
              break;
            }
          }
        } catch {
          hasUnloadedParents = true;
          break;
        }
      }
      
      // 检查子节点：如果所有子节点都已加载，则不显示下箭头
      const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];
      let hasUnloadedChildren = false;
      
      for (const linkId of childLinks) {
        try {
          const linkResponse = await linkService.getInfo(linkId);
          if (linkResponse.is_success && linkResponse.from_id) {
            const childId = linkResponse.from_id as string;
            if (!loadedNodes.value.has(childId)) {
              hasUnloadedChildren = true;
              break;
            }
          }
        } catch {
          hasUnloadedChildren = true;
          break;
        }
      }
      
      // 更新节点状态
      updateNodeHasMoreState(nodeId, hasUnloadedChildren, hasUnloadedParents);
    } catch {
      // 如果出错，保持现有状态
    }
  };

  // 搜索观点 - 使用API查询
  const searchOpinionsApi = async () => {
    if (!searchQuery.value.trim()) {
      searchOpinions.value = [];
      return;
    }

    try {
      searchLoading.value = true;
      const response = await opinionService.query({
        q: searchQuery.value.trim(),
        debate_id: debateId,
        max_num: 20
      });

      if (response.is_success && response.data) {
        searchOpinions.value = response.data;
      } else {
        searchOpinions.value = [];
      }
    } catch (err) {
      console.error('搜索观点失败:', err);
      searchOpinions.value = [];
    } finally {
      searchLoading.value = false;
    }
  };

  // 监听搜索查询变化
  watch(searchQuery, () => {
    searchOpinionsApi();
  });

  // 从localStorage加载设置
  const loadSettings = () => {
    try {
      const settings = localStorage.getItem('debate_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.maxUpdatedSon) maxUpdatedSon.value = parsed.maxUpdatedSon;
        if (parsed.numClickUpdatedSon) numClickUpdatedSon.value = parsed.numClickUpdatedSon;
        if (parsed.loadDepth) loadDepth.value = parsed.loadDepth;
      }
    } catch (error) {
      console.warn('加载设置失败:', error);
    }
  };

  // 添加节点
  const addNode = async (node: Node, hasMoreChildren: boolean | null = null, hasMoreParents: boolean | null = null) => {
    if (loadedNodes.value.has(node.id)) {
      // 如果节点已存在，只更新has_more状态
      if (hasMoreChildren !== null || hasMoreParents !== null) {
        updateNodeHasMoreState(node.id, hasMoreChildren, hasMoreParents);
      }
      return;
    }

    let finalHasMoreChildren = hasMoreChildren;
    let finalHasMoreParents = hasMoreParents;
    
    if (hasMoreChildren === null) {
      // 检查节点是否有子节点
      const rel = node.relationship;
      finalHasMoreChildren =
        (rel.supported_by && rel.supported_by.length > 0) ||
        (rel.opposed_by && rel.opposed_by.length > 0);
    }
    
    if (hasMoreParents === null) {
      // 检查节点是否有父节点
      const rel = node.relationship;
      finalHasMoreParents =
        (rel.supports && rel.supports.length > 0) ||
        (rel.opposes && rel.opposes.length > 0);
    }

    elements.value.push({
      data: {
        ...node,
        label: node.content.slice(0, 18) || '观点',
        has_more_children: finalHasMoreChildren as boolean,
        has_more_parents: finalHasMoreParents as boolean,
      },
      classes: node.logic_type === 'and' ? 'and-node' : 'or-node',
    });

    loadedNodes.value.add(node.id);
  };

  // 更新节点的has_more状态
  const updateNodeHasMoreState = (nodeId: string, hasMoreChildren: boolean | null, hasMoreParents: boolean | null) => {
    elements.value = elements.value.map((el) => {
      if (el.data && el.data.id === nodeId) {
        const nodeData = el.data as Node;
        if (hasMoreChildren !== null) {
          nodeData.has_more_children = hasMoreChildren;
        }
        if (hasMoreParents !== null) {
          nodeData.has_more_parents = hasMoreParents;
        }
      }
      return el;
    });
  };

  // 添加边
  const addEdge = (edge: Edge) => {
    if (loadedEdges.value.has(edge.id)) {
      return;
    }

    elements.value.push({
      data: {
        id: edge.id,
        source: edge.from_id,
        target: edge.to_id,
        link_type: edge.link_type,
      },
    });

    loadedEdges.value.add(edge.id);
  };

  // 加载子节点（支持深度加载）
  const loadChildren = async (parentId: string, num: number, depth: number = 1) => {
    if (depth <= 0) return;

    try {
      const response = await opinionService.getInfo(parentId, debateId);
      if (!response.is_success || !response.data) {
        console.warn(`[loadChildren] 获取父节点信息失败: ${parentId}`);
        return;
      }

      const rel = response.data.relationship;
      const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];

      // 如果没有子链接，直接更新has_more状态为false
      if (childLinks.length === 0) {
        updateNodeHasMore(parentId, 'children', false);
        return;
      }

      const pairs: Array<{ child: Node; link: Edge }> = [];

      // 收集所有子节点信息
      for (const linkId of childLinks) {
        try {
          const linkResponse = await linkService.getInfo(linkId);

          if (linkResponse.is_success) {
            // 根据实际API响应格式提取链接数据
            const linkData = {
              id: (linkResponse.id || linkId) as string,
              from_id: (linkResponse.from_id || '') as string,
              to_id: (linkResponse.to_id || '') as string,
              link_type: (linkResponse.link_type || 'supports') as import('@/types').LinkType,
            };

            const childResponse = await opinionService.getInfo(linkData.from_id, debateId);

            if (childResponse.is_success && childResponse.data) {
              pairs.push({
                child: childResponse.data,
                link: linkData as Edge,
              });
            } else {
              console.log(`[loadChildren] 获取子节点失败: ${linkData.from_id}`);
            }
          } else {
            console.log(`[loadChildren] 获取链接失败: ${linkId}`);
          }
        } catch (error) {
          console.warn(`[loadChildren] 处理链接 ${linkId} 时出错:`, error);
        }
      }

      // 按分数排序
      pairs.sort((a, b) => {
        const sa = (a.child.score.positive ?? 0) + (a.child.score.negative ?? 0);
        const sb = (b.child.score.positive ?? 0) + (b.child.score.negative ?? 0);
        return sb - sa;
      });

      const hasMore = pairs.length > num;
      let addedCount = 0;
      const nodesToRecurse: string[] = [];

      // 首先添加当前层级的节点
      for (const pair of pairs) {
        if (addedCount >= num) break;

        const wasNew = !loadedNodes.value.has(pair.child.id);
        const childNode = pair.child;

        // 计算子节点的箭头状态
        const childHasChildren = 
          (childNode.relationship.supported_by?.length > 0) ||
          (childNode.relationship.opposed_by?.length > 0);
        
        // 暂时使用简单逻辑，后续会更新
        const childHasParents = 
          (childNode.relationship.supports?.length > 0) ||
          (childNode.relationship.opposes?.length > 0);

        await addNode(childNode, childHasChildren, childHasParents);
        addEdge(pair.link);

        if (wasNew) {
          addedCount++;
          // 记录需要递归加载的节点
          if (depth > 1) {
            nodesToRecurse.push(pair.child.id);
          }
        }
      }

      // 然后递归加载更深层次的节点
      if (depth > 1 && nodesToRecurse.length > 0) {
        for (const nodeId of nodesToRecurse) {
          await loadChildren(nodeId, numClickUpdatedSon.value, depth - 1);
        }
      }

      updateNodeHasMore(parentId, 'children', hasMore);
      
      // 加载完成后，更新所有相关节点的箭头状态
      for (const pair of pairs.slice(0, num)) {
        await updateNodeArrowsState(pair.child.id);
      }
      // 也更新父节点自身的状态
      await updateNodeArrowsState(parentId);
    } catch (error) {
      console.error('加载子节点失败:', error);
      throw error; // 重新抛出错误，让上层处理
    }
  };

  // 加载父节点（支持深度加载）
  const loadParents = async (childId: string, num: number, depth: number = 1) => {
    if (depth <= 0) return;

    try {
      const response = await opinionService.getInfo(childId, debateId);
      if (!response.is_success || !response.data) {
        console.warn(`[loadParents] 获取子节点信息失败: ${childId}`);
        return;
      }

      const rel = response.data.relationship;
      const parentLinks = [...(rel.supports || []), ...(rel.opposes || [])];

      // 如果没有父链接，直接更新has_more状态为false
      if (parentLinks.length === 0) {
        updateNodeHasMore(childId, 'parents', false);
        return;
      }

      const pairs: Array<{ parent: Node; link: Edge }> = [];

      // 收集所有父节点信息
      for (const linkId of parentLinks) {
        try {
          const linkResponse = await linkService.getInfo(linkId);

          if (linkResponse.is_success) {
            // 根据实际API响应格式提取链接数据
            const linkData = {
              id: (linkResponse.id || linkId) as string,
              from_id: (linkResponse.from_id || '') as string,
              to_id: (linkResponse.to_id || '') as string,
              link_type: (linkResponse.link_type || 'supports') as import('@/types').LinkType,
            };

            const parentResponse = await opinionService.getInfo(linkData.to_id, debateId);

            if (parentResponse.is_success && parentResponse.data) {
              pairs.push({
                parent: parentResponse.data,
                link: linkData as Edge,
              });
            } else {
              console.log(`[loadParents] 获取父节点失败: ${linkData.to_id}`);
            }
          } else {
            console.log(`[loadParents] 获取链接失败: ${linkId}`);
          }
        } catch (error) {
          console.warn(`[loadParents] 处理链接 ${linkId} 时出错:`, error);
        }
      }

      // 按分数排序
      pairs.sort((a, b) => {
        const sa = (a.parent.score.positive ?? 0) + (a.parent.score.negative ?? 0);
        const sb = (b.parent.score.positive ?? 0) + (b.parent.score.negative ?? 0);
        return sb - sa;
      });

      const hasMore = pairs.length > num;
      let addedCount = 0;
      const nodesToRecurse: string[] = [];

      // 首先添加当前层级的节点
      for (const pair of pairs) {
        if (addedCount >= num) break;

        const wasNew = !loadedNodes.value.has(pair.parent.id);
        const parentNode = pair.parent;

        // 计算父节点的箭头状态
        const parentHasChildren = 
          (parentNode.relationship.supported_by?.length > 0) ||
          (parentNode.relationship.opposed_by?.length > 0);
        
        // 暂时使用简单逻辑，后续会更新
        const parentHasParents = 
          (parentNode.relationship.supports?.length > 0) ||
          (parentNode.relationship.opposes?.length > 0);

        await addNode(parentNode, parentHasChildren, parentHasParents);
        addEdge(pair.link);

        if (wasNew) {
          addedCount++;
          // 记录需要递归加载的节点
          if (depth > 1) {
            nodesToRecurse.push(pair.parent.id);
          }
        }
      }

      // 然后递归加载更深层次的节点
      if (depth > 1 && nodesToRecurse.length > 0) {
        for (const nodeId of nodesToRecurse) {
          await loadParents(nodeId, numClickUpdatedSon.value, depth - 1);
        }
      }

      updateNodeHasMore(childId, 'parents', hasMore);
      
      // 加载完成后，更新所有相关节点的箭头状态
      for (const pair of pairs.slice(0, num)) {
        await updateNodeArrowsState(pair.parent.id);
      }
      // 也更新子节点自身的状态
      await updateNodeArrowsState(childId);
    } catch (error) {
      console.error('加载父节点失败:', error);
      throw error; // 重新抛出错误，让上层处理
    }
  };

  // 更新节点的has_more属性
  const updateNodeHasMore = (nodeId: string, direction: 'children' | 'parents', hasMore: boolean) => {
    elements.value = elements.value.map((el) => {
      if (el.data && el.data.id === nodeId) {
        if (direction === 'children') {
          (el.data as Node).has_more_children = hasMore;
        } else {
          (el.data as Node).has_more_parents = hasMore;
        }
      }
      return el;
    });
  };

  // 加载初始节点
  const loadInitialNodes = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await opinionService.getHeads({
        debate_id: debateId,
        is_root: true,
      });

      if (response.is_success && response.data?.length) {
        for (const rootId of response.data) {
          try {
            const nodeResponse = await opinionService.getInfo(rootId, debateId);
            if (nodeResponse.is_success && nodeResponse.data) {
              const node = nodeResponse.data;
              
              // 对于根节点，检查是否确实有父节点
              const hasParents = node.relationship.supports?.length > 0 || node.relationship.opposes?.length > 0;
              const hasChildren = node.relationship.supported_by?.length > 0 || node.relationship.opposed_by?.length > 0;
              
              await addNode(node, hasChildren, hasParents);
              
              // 初始加载时使用配置的深度设置
              if (hasChildren) {
                await loadChildren(node.id, maxUpdatedSon.value, loadDepth.value);
              }
            }
          } catch (error) {
            console.warn('加载节点失败:', error);
          }
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载观点失败';
    } finally {
      loading.value = false;
    }
  };

  // 刷新视图
  const refreshView = async () => {
    elements.value = [];
    loadedNodes.value.clear();
    loadedEdges.value.clear();
    selectedNode.value = null;
    selectedEdge.value = null;
    await loadInitialNodes();
  };

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

      if (response.is_success) {
        await refreshView();
        return response.data;
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
    score?: { positive?: number | null };
    is_llm_score?: boolean;
    creator?: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await opinionService.update(data);

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
    loading.value = true;
    error.value = null;

    try {
      const response = await opinionService.delete({
        opinion_id: opinionId,
        debate_id: debateId,
      });

      if (response.is_success) {
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '删除观点失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除观点失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 创建链接
  const createLink = async (data: { from_id: string; to_id: string; link_type: LinkType }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.create(data);

      if (response.is_success) {
        await refreshView();
        return response.data;
      } else {
        error.value = response.msg || '创建连接失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建连接失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 更新链接
  const updateLink = async (data: { id: string; link_type?: LinkType }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.update(data);

      if (response.is_success) {
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

  // 删除链接
  const deleteLink = async (linkId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.delete({ id: linkId });

      if (response.is_success) {
        await refreshView();
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

  const clearError = () => {
    error.value = null;
  };

  // 根据观点ID找到节点并居中显示，同时加载其父子节点
  const focusOnOpinion = async (opinionId: string) => {
    // 如果节点尚未加载，则先尝试加载
    if (!loadedNodes.value.has(opinionId)) {
      try {
        const nodeResponse = await opinionService.getInfo(opinionId, debateId);
        if (nodeResponse.is_success && nodeResponse.data) {
          await addNode(nodeResponse.data);
        } else {
          error.value = '无法找到指定的观点';
          return;
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : '加载观点失败';
        return;
      }
    }

    // 加载父子节点
    await Promise.all([
      loadChildren(opinionId, maxUpdatedSon.value, 1),
      loadParents(opinionId, maxUpdatedSon.value, 1),
    ]);

    // 返回节点ID，让组件处理居中显示
    return opinionId;
  };

  // 初始化
  loadSettings();

  return {
    // 状态
    elements: computed(() => elements.value),
    availableNodes,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedNode: computed(() => selectedNode.value),
    selectedEdge: computed(() => selectedEdge.value),

    // 搜索相关
    searchQuery,
    searchOpinions: computed(() => searchOpinions.value),
    searchLoading: computed(() => searchLoading.value),

    // 设置
    maxUpdatedSon,
    numClickUpdatedSon,
    loadDepth,

    // 方法
    loadInitialNodes,
    loadChildren,
    loadParents,
    focusOnOpinion,
    refreshView,
    createOpinion,
    updateOpinion,
    deleteOpinion,
    createLink,
    updateLink,
    deleteLink,
    clearError,

    // 选择相关
    setSelectedNode: (node: Node | null) => {
      selectedNode.value = node;
    },
    setSelectedEdge: (edge: Edge | null) => {
      selectedEdge.value = edge;
    },
  };
}
