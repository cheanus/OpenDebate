import { computed, type Ref } from 'vue';
import { wrapLabelText, getNodeSize } from '@/utils';
import type { Node, Element, Edge, UpdatedNodes } from '@/types';

/**
 * 图形元素管理 (节点和边的增删查改)
 */
export function useGraphElements(
  elements: Ref<Element[]>,
  loadedNodes: Ref<Set<string>>,
  loadedEdges: Ref<Set<string>>,
) {
  // 计算属性
  const availableNodes = computed(() => {
    return elements.value
      .filter((el) => el.data && 'content' in el.data)
      .map((el) => el.data as Node);
  });

  // 刷新部分观点的分
  const refreshOpinions = (updateNodes: UpdatedNodes) => {
    console.log('[refreshOpinions] 准备更新节点分数:', updateNodes);
    elements.value = elements.value.map((el) => {
      if (el.data && 'content' in el.data) {
        const nodeData = el.data as Node;
        if (updateNodes[nodeData.id]) {
          const updatedData = updateNodes[nodeData.id];
          // 只更新分数相关字段
          nodeData.score.positive =
            updatedData.positive !== undefined ? updatedData.positive : nodeData.score.positive;
          nodeData.score.negative =
            updatedData.negative !== undefined ? updatedData.negative : nodeData.score.negative;
        }
      }
      return el;
    });
    console.log('[refreshOpinions] 元素更新完成:', elements.value);
  };

  // 添加节点
  // 兼顾更新 has_more 状态
  const addNode = (
    node: Node,
    hasMoreChildren: boolean | null = null,
    hasMoreParents: boolean | null = null,
  ) => {
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
      // 检查节点是否有未加载的子节点
      const rel = node.relationship;
      const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];
      finalHasMoreChildren = childLinks.some((linkId) => !loadedEdges.value.has(linkId));
    }

    if (hasMoreParents === null) {
      // 检查节点是否有未加载的父节点
      const rel = node.relationship;
      const parentLinks = [...(rel.supports || []), ...(rel.opposes || [])];
      finalHasMoreParents = parentLinks.some((linkId) => !loadedEdges.value.has(linkId));
    }

    const node_width = getNodeSize(node.score);
    elements.value.push({
      data: {
        ...node,
        width: node_width,
        label: wrapLabelText(node.content, node_width),
        has_more_children: finalHasMoreChildren as boolean,
        has_more_parents: finalHasMoreParents as boolean,
      },
      classes: node.logic_type === 'and' ? 'and-node' : 'or-node',
    });

    loadedNodes.value.add(node.id);
  };

  // 更新节点的has_more状态
  const updateNodeHasMoreState = (
    nodeId: string,
    hasMoreChildren: boolean | null,
    hasMoreParents: boolean | null,
  ) => {
    elements.value = elements.value.map((el) => {
      if (el.data && el.data.id === nodeId && 'content' in el.data) {
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
        link_type: edge.link_type,
        source: edge.from_id,
        target: edge.to_id,
      },
    } as Element);

    loadedEdges.value.add(edge.id);

    // 更新两个节点的箭头状态
    updateNodeArrowsState(edge.from_id);
    updateNodeArrowsState(edge.to_id);
  };

  // 移除节点
  const removeNode = (nodeId: string) => {
    elements.value = elements.value.filter((el) => {
      // 移除节点本身
      if (el.data) {
        if ('classes' in el && el.data.id === nodeId) {
          console.log('[removeNode] 找到并移除节点:', nodeId);
          return false;
        }
        // 移除相关的边
        if (!('classes' in el)) {
          const linkData = el.data;
          if (linkData.source === nodeId || linkData.target === nodeId) {
            console.log(
              '[removeNode] 移除相关边:',
              linkData.id,
              'source:',
              linkData.source,
              'target:',
              linkData.target,
            );
            loadedEdges.value.delete(linkData.id);
            return false;
          }
        }
      }
      return true;
    });

    loadedNodes.value.delete(nodeId);
  };

  // 移除边
  const removeEdge = (edgeId: string) => {
    elements.value = elements.value.filter((el) => {
      if (!('classes' in el) && el.data.id === edgeId) {
        return false;
      }
      return true;
    });

    loadedEdges.value.delete(edgeId);
  };

  // 更新节点箭头状态 - 检查已加载的相邻节点
  const updateNodeArrowsState = async (nodeId: string) => {
    // 不需要debate_id，这些元素本身就是debate_id内的
    const focusNode = elements.value.filter((el) => 'classes' in el && el.data.id === nodeId)[0]
      .data as Node;
    const rel = focusNode.relationship;

    // 检查父节点：如果所有父节点都已加载，则不显示上箭头
    const parentLinks = [...(rel.supports || []), ...(rel.opposes || [])];
    let hasUnloadedParents = false;

    for (const linkId of parentLinks) {
      if (!loadedEdges.value.has(linkId)) {
        hasUnloadedParents = true;
        break;
      }
    }

    // 检查子节点：如果所有子节点都已加载，则不显示下箭头
    const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];
    let hasUnloadedChildren = false;

    for (const linkId of childLinks) {
      if (!loadedEdges.value.has(linkId)) {
        hasUnloadedChildren = true;
        break;
      }
    }

    // 更新节点状态
    updateNodeHasMoreState(nodeId, hasUnloadedChildren, hasUnloadedParents);
  };

  return {
    // 计算属性
    availableNodes,
    // 方法
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    updateNodeHasMoreState,
    updateNodeArrowsState,
    refreshOpinions,
  };
}
