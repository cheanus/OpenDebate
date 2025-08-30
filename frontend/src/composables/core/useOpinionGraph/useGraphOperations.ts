import { opinionService, linkService } from '@/services';
import type { Node, Edge } from '@/types';
import type { Ref } from 'vue';

/**
 * 图形操作 (加载节点、搜索定位等)
 */
export function useGraphOperations(
  debateId: string,
  addNode: (node: Node, hasMoreChildren?: boolean | null, hasMoreParents?: boolean | null) => void,
  addEdge: (edge: Edge) => void,
  updateNodeHasMoreState: (
    nodeId: string,
    hasMoreChildren: boolean | null,
    hasMoreParents: boolean | null,
  ) => void,
  updateNodeArrowsState: (nodeId: string) => Promise<void>,
  loadedNodes: Ref<Set<string>>,
  numClickUpdatedSon: Ref<number>,
) {
  // 更新节点的has_more状态的辅助函数
  const updateNodeHasMore = (
    nodeId: string,
    direction: 'children' | 'parents',
    hasMore: boolean,
  ) => {
    if (direction === 'children') {
      updateNodeHasMoreState(nodeId, hasMore, null);
    } else {
      updateNodeHasMoreState(nodeId, null, hasMore);
    }
  };

  // 通用加载节点函数（支持子节点和父节点）
  const loadNodes = async (
    nodeId: string,
    direction: 'children' | 'parents',
    num: number,
    depth: number = 1,
  ) => {
    if (depth <= 0) return;

    try {
      const response = await opinionService.getInfo(nodeId, debateId);
      if (!response.is_success || !response.data) {
        console.warn(`[loadNodes] 获取节点信息失败: ${nodeId}`);
        return;
      }

      const rel = response.data.relationship;
      const links =
        direction === 'children'
          ? [...(rel.supported_by || []), ...(rel.opposed_by || [])]
          : [...(rel.supports || []), ...(rel.opposes || [])];

      // 如果没有链接，直接更新has_more状态为false
      if (links.length === 0) {
        updateNodeHasMore(nodeId, direction, false);
        return;
      }

      const pairs: Array<{ node: Node; link: Edge }> = [];

      // 收集所有节点信息
      for (const linkId of links) {
        try {
          const linkResponse = await linkService.getInfo(linkId);

          if (linkResponse.is_success) {
            const linkData = {
              id: (linkResponse.id || linkId) as string,
              from_id: (linkResponse.from_id || '') as string,
              to_id: (linkResponse.to_id || '') as string,
              link_type: (linkResponse.link_type || 'supports') as import('@/types').LinkType,
              is_success: true,
              msg: null,
            };

            const targetId = direction === 'children' ? linkData.from_id : linkData.to_id;
            const nodeResponse = await opinionService.getInfo(targetId, debateId);

            if (nodeResponse.is_success && nodeResponse.data) {
              pairs.push({
                node: nodeResponse.data,
                link: linkData as Edge,
              });
            } else {
              console.log(
                `[loadNodes] 获取${direction === 'children' ? '子' : '父'}节点失败: ${targetId}`,
              );
            }
          } else {
            console.log(`[loadNodes] 获取链接失败: ${linkId}`);
          }
        } catch (error) {
          console.warn(`[loadNodes] 处理链接 ${linkId} 时出错:`, error);
        }
      }

      // 按分数排序
      pairs.sort((a, b) => {
        const sa = (a.node.score.positive ?? 0) + (a.node.score.negative ?? 0);
        const sb = (b.node.score.positive ?? 0) + (b.node.score.negative ?? 0);
        return sb - sa;
      });

      const hasMore = pairs.length > num;
      let addedCount = 0;
      const nodesToRecurse: string[] = [];

      // 添加当前层级的节点
      for (const pair of pairs) {
        if (addedCount >= num) break;

        const wasNew = !loadedNodes.value.has(pair.node.id);
        const currentNode = pair.node;

        // 计算节点的箭头状态
        const hasChildren =
          currentNode.relationship.supported_by?.length > 0 ||
          currentNode.relationship.opposed_by?.length > 0;
        const hasParents =
          currentNode.relationship.supports?.length > 0 ||
          currentNode.relationship.opposes?.length > 0;

        addNode(currentNode, hasChildren, hasParents);
        addEdge(pair.link);

        if (wasNew) {
          addedCount++;
          // 记录需要递归加载的节点
          if (depth > 1) {
            nodesToRecurse.push(pair.node.id);
          }
        }
      }

      // 递归加载更深层次的节点
      if (depth > 1 && nodesToRecurse.length > 0) {
        for (const recurseNodeId of nodesToRecurse) {
          await loadNodes(recurseNodeId, direction, numClickUpdatedSon.value, depth - 1);
        }
      }

      updateNodeHasMore(nodeId, direction, hasMore);

      // 加载完成后，更新所有相关节点的箭头状态
      for (const pair of pairs.slice(0, num)) {
        await updateNodeArrowsState(pair.node.id);
      }
      // 也更新当前节点自身的状态
      await updateNodeArrowsState(nodeId);
    } catch (error) {
      console.error(`加载${direction === 'children' ? '子' : '父'}节点失败:`, error);
      throw error;
    }
  };

  // 加载子节点（支持深度加载）
  const loadChildren = async (parentId: string, num: number, depth: number = 1) => {
    return loadNodes(parentId, 'children', num, depth);
  };

  // 加载父节点（支持深度加载）
  const loadParents = async (childId: string, num: number, depth: number = 1) => {
    return loadNodes(childId, 'parents', num, depth);
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
      addNode(opinion);

      // 加载父节点和子节点
      await Promise.all([
        loadParents(opinionId, maxNodes, 1),
        loadChildren(opinionId, maxNodes, 1),
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
              rootNode.relationship?.supported_by?.length > 0 ||
              rootNode.relationship?.opposed_by?.length > 0;

            addNode(rootNode, hasChildren, false);

            // 初始化时自动加载子节点，使用默认深度2层
            if (hasChildren) {
              await loadChildren(rootNode.id, numClickUpdatedSon.value, 2);
            }

            // 更新箭头状态
            await updateNodeArrowsState(rootNode.id);
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
