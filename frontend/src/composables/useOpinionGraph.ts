import { ref, computed } from 'vue';
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

  // 设置
  const maxUpdatedSon = ref(APP_CONFIG.defaults.maxUpdatedSon);
  const numClickUpdatedSon = ref(APP_CONFIG.defaults.numClickUpdatedSon);
  const loadDepth = ref(APP_CONFIG.defaults.loadDepth);
  const maxLoadNodes = ref(APP_CONFIG.defaults.maxLoadNodes);

  // 计算属性
  const availableNodes = computed(() => {
    return elements.value
      .filter((el) => el.data && el.data.id && 'content' in el.data)
      .map((el) => el.data) as Node[];
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
        if (parsed.maxLoadNodes) maxLoadNodes.value = parsed.maxLoadNodes;
      }
    } catch (error) {
      console.warn('加载设置失败:', error);
    }
  };

  // 添加节点
  const addNode = async (node: Node, hasMore: boolean | null = null) => {
    if (loadedNodes.value.has(node.id)) {
      console.log(`[addNode] 节点 ${node.id} 已存在，跳过添加`);
      return;
    }

    let finalHasMore = hasMore;
    if (hasMore === null) {
      // 检查节点是否有子节点
      const rel = node.relationship;
      finalHasMore = 
        (rel.supported_by && rel.supported_by.length > 0) ||
        (rel.opposed_by && rel.opposed_by.length > 0);
    }

    console.log(`[addNode] 添加节点 ${node.id}: ${node.content.slice(0, 30)}...，有更多子节点: ${finalHasMore}`);

    elements.value.push({
      data: {
        ...node,
        label: node.content.slice(0, 18) || '观点',
        has_more_children: finalHasMore as boolean,
      },
      classes: node.logic_type === 'and' ? 'and-node' : 'or-node',
    });

    loadedNodes.value.add(node.id);
    console.log(`[addNode] 当前总节点数: ${elements.value.length}`);
  };

  // 添加边
  const addEdge = (edge: Edge) => {
    if (loadedEdges.value.has(edge.id)) {
      console.log(`[addEdge] 边 ${edge.id} 已存在，跳过添加`);
      return;
    }

    console.log(`[addEdge] 添加边 ${edge.id}: ${edge.from_id} -> ${edge.to_id} (${edge.link_type})`);

    elements.value.push({
      data: {
        id: edge.id,
        source: edge.from_id,
        target: edge.to_id,
        link_type: edge.link_type,
      },
    });

    loadedEdges.value.add(edge.id);
    console.log(`[addEdge] 当前总边数: ${loadedEdges.value.size}`);
  };

  // 加载子节点（支持深度加载）
  const loadChildren = async (parentId: string, num: number, depth: number = 1) => {
    if (depth <= 0) return;
    
    console.log(`[loadChildren] 开始加载节点 ${parentId} 的子节点，数量限制: ${num}，深度: ${depth}`);
    
    try {
      const response = await opinionService.getInfo(parentId, debateId);
      if (!response.is_success || !response.data) {
        console.log(`[loadChildren] 获取节点 ${parentId} 信息失败`);
        return;
      }

      const rel = response.data.relationship;
      const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];
      console.log(`[loadChildren] 节点 ${parentId} 有 ${childLinks.length} 个子连接:`, childLinks);
      
      const pairs: Array<{ child: Node; link: Edge }> = [];

      // 收集所有子节点信息
      for (const linkId of childLinks) {
        try {
          console.log(`[loadChildren] 正在获取链接信息: ${linkId}`);
          const linkResponse = await linkService.getInfo(linkId);
          console.log(`[loadChildren] 链接响应:`, linkResponse);
          
          if (linkResponse.is_success) {
            // 根据实际API响应格式提取链接数据
            const linkData = {
              id: (linkResponse.id || linkId) as string,
              from_id: (linkResponse.from_id || '') as string,
              to_id: (linkResponse.to_id || '') as string,
              link_type: (linkResponse.link_type || 'supports') as import('@/types').LinkType,
            };
            
            console.log(`[loadChildren] 链接数据: from=${linkData.from_id}, to=${linkData.to_id}`);
            const childResponse = await opinionService.getInfo(linkData.from_id, debateId);
            console.log(`[loadChildren] 子节点响应:`, childResponse);
            
            if (childResponse.is_success && childResponse.data) {
              console.log(`[loadChildren] 成功获取子节点: ${childResponse.data.id}`);
              pairs.push({ 
                child: childResponse.data, 
                link: linkData as Edge
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

      console.log(`[loadChildren] 共收集到 ${pairs.length} 个子节点`);

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
        console.log(`[loadChildren] 添加节点 ${pair.child.id}，是否新节点: ${wasNew}`);
        
        await addNode(pair.child);
        addEdge(pair.link);
        
        if (wasNew) {
          addedCount++;
          // 记录需要递归加载的节点
          if (depth > 1) {
            nodesToRecurse.push(pair.child.id);
          }
        }
      }

      console.log(`[loadChildren] 本层添加了 ${addedCount} 个节点，需要递归的节点: ${nodesToRecurse.length} 个`);

      // 然后递归加载更深层次的节点
      if (depth > 1 && nodesToRecurse.length > 0) {
        for (const nodeId of nodesToRecurse) {
          // 限制总的加载节点数量
          if (loadedNodes.value.size >= maxLoadNodes.value) break;
          await loadChildren(nodeId, Math.min(numClickUpdatedSon.value, 3), depth - 1);
        }
      }

      updateNodeHasMore(parentId, hasMore);
      console.log(`[loadChildren] 完成加载节点 ${parentId} 的子节点，总节点数: ${loadedNodes.value.size}`);
    } catch (error) {
      console.error('加载子节点失败:', error);
    }
  };

  // 更新节点的has_more属性
  const updateNodeHasMore = (nodeId: string, hasMore: boolean) => {
    elements.value = elements.value.map((el) => {
      if (el.data && el.data.id === nodeId) {
        (el.data as Node).has_more_children = hasMore;
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
        is_root: true 
      });

      if (response.is_success && response.data?.length) {
        for (const rootId of response.data) {
          try {
            const nodeResponse = await opinionService.getInfo(rootId, debateId);
            if (nodeResponse.is_success && nodeResponse.data) {
              await addNode(nodeResponse.data);
              // 初始加载时使用配置的深度设置
              await loadChildren(nodeResponse.data.id, maxUpdatedSon.value, loadDepth.value);
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
  const createLink = async (data: {
    from_id: string;
    to_id: string;
    link_type: LinkType;
  }) => {
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
  const updateLink = async (data: {
    id: string;
    link_type?: LinkType;
  }) => {
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
    
    // 设置
    maxUpdatedSon,
    numClickUpdatedSon,
    loadDepth,
    maxLoadNodes,
    
    // 方法
    loadInitialNodes,
    loadChildren,
    refreshView,
    createOpinion,
    updateOpinion,
    deleteOpinion,
    createLink,
    updateLink,
    deleteLink,
    clearError,
    
    // 选择相关
    setSelectedNode: (node: Node | null) => { selectedNode.value = node; },
    setSelectedEdge: (edge: Edge | null) => { selectedEdge.value = edge; },
  };
}
