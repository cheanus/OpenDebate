import cytoscape from 'cytoscape';
import type { Core, ElementDefinition, LayoutOptions, StylesheetStyle } from 'cytoscape';

/**
 * 文本换行工具函数
 */
export function wrapLabelText(text: string, width: number, zoomFactor = 0.05): string {
  if (!text) return '';
  const scaledWidth = Math.floor(width * zoomFactor);
  if (scaledWidth < 1) return text;

  // 将文本每 scaledWidth 个字符分隔成一行
  const regex = new RegExp(`.{1,${scaledWidth}}`, 'g');
  const matches = text.match(regex);
  return matches ? matches.join('\n') : text;
}

/**
 * Cytoscape 实例管理
 */
export function useCytoscapeManager() {
  
  // 初始化 Cytoscape 实例
  const initializeCytoscape = (
    container: HTMLElement,
    elements: ElementDefinition[],
    layout: LayoutOptions,
    styles: StylesheetStyle[]
  ): Core => {
    const cyInstance = cytoscape({
      container,
      elements,
      style: styles,
      layout,
      // 禁用用户选择和框选
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autounselectify: false,
      // 性能优化 - 修复边消失问题
      hideEdgesOnViewport: false,  // 关闭视口移动时隐藏边
      textureOnViewport: false,    // 关闭纹理优化避免渲染问题  
      motionBlur: false,           // 关闭运动模糊避免显示问题
      motionBlurOpacity: 0.2,
      // 移除自定义wheelSensitivity，使用默认值
      // 最小和最大缩放级别
      minZoom: 0.1,
      maxZoom: 3,
    });

    return cyInstance;
  };

  // 更新元素
  const updateElements = (cy: Core, newElements: ElementDefinition[]) => {
    // 获取当前元素ID集合
    const currentElementIds = new Set(cy.elements().map(el => el.id()));
    const newElementIds = new Set(newElements.map(el => el.data.id).filter((id): id is string => id !== undefined));
    
    // 移除不再存在的元素
    const toRemove = [...currentElementIds].filter(id => !newElementIds.has(id));
    if (toRemove.length > 0) {
      cy.remove(cy.getElementById(toRemove.join(', ')));
    }
    
    // 添加新元素或更新现有元素
    newElements.forEach(element => {
      const elementId = element.data.id;
      if (!elementId) return; // 跳过没有ID的元素
      
      const existing = cy.getElementById(elementId);
      if (existing.length === 0) {
        // 添加新元素
        cy.add(element);
      } else {
        // 更新现有元素的数据
        existing.data(element.data);
        if (element.classes) {
          existing.classes(element.classes);
        }
      }
    });
  };

  // 适配视图
  const fitToView = (cy: Core) => {
    cy.fit(undefined, 50);
  };

  // 居中到指定节点
  const centerOnNode = (cy: Core, nodeId: string) => {
    const node = cy.getElementById(nodeId);
    if (node.length > 0) {
      cy.center(node);
      cy.zoom(1.5);
    }
  };

  // 刷新布局
  const refreshLayout = (cy: Core, layout: LayoutOptions) => {
    const layoutInstance = cy.layout(layout);
    layoutInstance.run();
  };

  return {
    initializeCytoscape,
    updateElements,
    fitToView,
    centerOnNode,
    refreshLayout,
  };
}
