import { opinionService, linkService } from '@/services';
import type { Node, Edge } from '@/types';
import type { Ref } from 'vue';

/**
 * 图形操作 (加载节点、搜索定位等)
 */
export function useGraphOperations(
  debateId: string,
  addNode: (node: Node, hasMoreChildren?: boolean | null, hasMoreParents?: boolean | null) => Promise<void>,
  addEdge: (edge: Edge) => void,
  updateNodeHasMoreState: (nodeId: string, hasMoreChildren: boolean | null, hasMoreParents: boolean | null) => void,
  updateNodeArrowsState: (nodeId: string, debateId: string) => Promise<void>,
  loadedNodes: Ref<Set<string>>,
  numClickUpdatedSon: Ref<number>
) {
  
  // 更新节点的has_more状态的辅助函数
  const updateNodeHasMore = (nodeId: string, direction: 'children' | 'parents', hasMore: boolean) => {
    if (direction === 'children') {
      updateNodeHasMoreState(nodeId, hasMore, null);
    } else {
      updateNodeHasMoreState(nodeId, null, hasMore);
    }
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
              is_success: true,
              msg: null,
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
        await updateNodeArrowsState(pair.child.id, debateId);
      }
      // 也更新父节点自身的状态
      await updateNodeArrowsState(parentId, debateId);
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
              is_success: true,
              msg: null,
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
        await updateNodeArrowsState(pair.parent.id, debateId);
      }
      // 也更新子节点自身的状态
      await updateNodeArrowsState(childId, debateId);
    } catch (error) {
      console.error('加载父节点失败:', error);
      throw error; // 重新抛出错误，让上层处理
    }
  };

  // 搜索并居中到指定观点
  const focusOnOpinion = async (opinionId: string, maxNodes: number) => {
    try {
      // 首先加载该观点本身
      const response = await opinionService.getInfo(opinionId, debateId);
      if (!response.is_success || !response.data) {
        console.warn('无法获取观点信息:', opinionId);
        return false;
      }

      const opinion = response.data;
      await addNode(opinion);

      // 加载父节点和子节点
      await Promise.all([
        loadParents(opinionId, maxNodes, 1),
        loadChildren(opinionId, maxNodes, 1)
      ]);

      return true;
    } catch (error) {
      console.error('定位观点失败:', error);
      return false;
    }
  };

  // 加载辩论的根节点
  const loadRootNodes = async (maxNodes: number) => {
    try {
      // 使用 getHeads API 获取根节点ID列表
      const response = await opinionService.getHeads({
        debate_id: debateId,
        is_root: true,
      });
      
      if (!response.is_success || !response.data?.length) {
        console.warn('无法获取根节点');
        return;
      }

      // 获取根节点ID列表，然后逐个获取节点信息
      const rootIds = response.data.slice(0, maxNodes);
      
      for (const rootId of rootIds) {
        try {
          const nodeResponse = await opinionService.getInfo(rootId, debateId);
          if (nodeResponse.is_success && nodeResponse.data) {
            const rootNode = nodeResponse.data;
            
            const hasChildren = 
              (rootNode.relationship?.supported_by?.length > 0) ||
              (rootNode.relationship?.opposed_by?.length > 0);

            await addNode(rootNode, hasChildren, false);
            
            // 初始化时自动加载子节点，使用默认深度2层
            if (hasChildren) {
              await loadChildren(rootNode.id, numClickUpdatedSon.value, 2);
            }
            
            // 更新箭头状态
            await updateNodeArrowsState(rootNode.id, debateId);
          }
        } catch (nodeError) {
          console.warn('加载根节点失败:', nodeError);
        }
      }
    } catch (error) {
      console.error('加载根节点失败:', error);
      throw error;
    }
  };

  return {
    loadChildren,
    loadParents,
    focusOnOpinion,
    loadRootNodes,
  };
}
