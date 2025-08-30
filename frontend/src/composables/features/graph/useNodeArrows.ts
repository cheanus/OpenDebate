import { ref } from 'vue';
import { getNodeSize } from '@/utils';
import type { Core } from 'cytoscape';
import type { Node, Element } from '@/types';

/**
 * 节点箭头管理
 */
export function useNodeArrows() {
  // 计算需要显示箭头的节点
  const nodesWithArrows = ref<
    Array<{
      id: string;
      hasParentsArrow: boolean;
      hasChildrenArrow: boolean;
      style: Record<string, string>;
      showArrows: boolean;
    }>
  >([]);

  // 显示节点箭头
  const showNodeArrows = (nodeId: string) => {
    const node = nodesWithArrows.value.find((n) => n.id === nodeId);
    if (node) {
      node.showArrows = true;
    }
  };

  // 隐藏节点箭头
  const hideNodeArrows = (nodeId: string) => {
    const node = nodesWithArrows.value.find((n) => n.id === nodeId);
    if (node) {
      node.showArrows = false;
    }
  };

  // 更新箭头位置
  const updateArrowsPosition = (
    cy: Core | null,
    elements: Element[],
    cyContainer: HTMLElement | null,
  ) => {
    if (!cy || !cyContainer) return;

    const containerRect = cyContainer.getBoundingClientRect();
    if (!containerRect) return;

    const zoom = cy.zoom();

    const arrows = [];

    for (const element of elements) {
      if (!element.data || !('content' in element.data)) continue;

      const nodeData = element.data as Node;
      const cyNode = cy.getElementById(nodeData.id);

      if (!cyNode.length) continue;

      const hasParentsArrow = nodeData.has_more_parents || false;
      const hasChildrenArrow = nodeData.has_more_children || false;

      if (!hasParentsArrow && !hasChildrenArrow) continue;

      // 获取节点在画布中的渲染位置
      const renderedPos = cyNode.renderedPosition();
      const nodeSize = getNodeSize(cyNode.data('score'));
      const scaledNodeSize = nodeSize * zoom; // 按缩放比例调整节点大小

      // 保持现有节点的showArrows状态，如果不存在则默认为false
      const existingNode = nodesWithArrows.value.find((n) => n.id === nodeData.id);
      const showArrows = existingNode ? existingNode.showArrows : false;

      // 动态调整箭头容器样式，考虑不同缩放级别
      const arrowContainerStyle: Record<string, string> = {
        left: `${renderedPos.x - scaledNodeSize / 2}px`,
        top: `${renderedPos.y - scaledNodeSize / 2}px`,
        width: `${scaledNodeSize}px`,
        height: `${scaledNodeSize}px`,
      };

      // 当节点太小时，添加特殊的 CSS 类以应用不同的箭头样式
      if (scaledNodeSize < 30) {
        arrowContainerStyle['data-size'] = 'small';
      } else if (scaledNodeSize < 50) {
        arrowContainerStyle['data-size'] = 'medium';
      } else {
        arrowContainerStyle['data-size'] = 'large';
      }

      arrows.push({
        id: nodeData.id,
        hasParentsArrow,
        hasChildrenArrow,
        showArrows,
        style: arrowContainerStyle,
      });
    }

    nodesWithArrows.value = arrows;
  };

  return {
    nodesWithArrows,
    showNodeArrows,
    hideNodeArrows,
    updateArrowsPosition,
  };
}
