/**
 * Cytoscape 图形样式配置
 */
import type { Node } from '@/types';

// Cytoscape 节点接口定义
interface CytoscapeNode {
  data: (key: string) => unknown;
}

interface ThemeColors {
  andNodeColor: string;
  orNodeColor: string;
  textColor: string;
  borderColor: string;
  supportColor: string;
  opposeColor: string;
  mixedBorderColor: string;
  parentBorderColor: string;
  childBorderColor: string;
}

export function getCytoscapeStyles(themeColors: ThemeColors) {
  return [
    // 节点样式
    {
      selector: 'node',
      style: {
        'background-color': '#ffffff',
        'border-width': 3,
        'border-color': themeColors.borderColor,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': themeColors.textColor,
        'font-size': '14px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '120px',
        'width': (node: CytoscapeNode) => {
          const nodeData = node.data('score') as Node['score'] | undefined;
          const pos = nodeData ? nodeData.positive : null;
          const neg = nodeData ? nodeData.negative : null;
          let avg = null;
          if (pos != null && neg != null) avg = (pos + neg) / 2;
          else if (pos != null) avg = pos;
          else if (neg != null) avg = neg;
          if (avg == null) return 60;
          return 60 + 120 * avg;
        },
        'height': (node: CytoscapeNode) => {
          const nodeData = node.data('score') as Node['score'] | undefined;
          const pos = nodeData ? nodeData.positive : null;
          const neg = nodeData ? nodeData.negative : null;
          let avg = null;
          if (pos != null && neg != null) avg = (pos + neg) / 2;
          else if (pos != null) avg = pos;
          else if (neg != null) avg = neg;
          if (avg == null) return 60;
          return 60 + 120 * avg;
        },
      },
    },
    // and 节点样式
    {
      selector: 'node.and-node',
      style: {
        'background-color': themeColors.andNodeColor,
      },
    },
    // or 节点样式
    {
      selector: 'node.or-node',
      style: {
        'background-color': themeColors.orNodeColor,
      },
    },
    // 有更多子节点的节点边框
    {
      selector: 'node[?has_more_children][?has_more_parents]',
      style: {
        'border-color': themeColors.mixedBorderColor,
        'border-width': 4,
      },
    },
    {
      selector: 'node[?has_more_parents][!has_more_children]',
      style: {
        'border-color': themeColors.parentBorderColor,
        'border-width': 4,
      },
    },
    {
      selector: 'node[?has_more_children][!has_more_parents]',
      style: {
        'border-color': themeColors.childBorderColor,
        'border-width': 4,
      },
    },
    // 选中节点样式
    {
      selector: 'node:selected',
      style: {
        'border-width': 5,
        'border-color': '#ff9800',
        'overlay-color': '#ff9800',
        'overlay-opacity': 0.2,
      },
    },
    // 边样式
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': themeColors.supportColor,
        'target-arrow-color': themeColors.supportColor,
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': '',
        'font-size': '12px',
        'color': themeColors.textColor,
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
      },
    },
    // 支持连接样式
    {
      selector: 'edge[link_type = "supports"]',
      style: {
        'line-color': themeColors.supportColor,
        'target-arrow-color': themeColors.supportColor,
      },
    },
    // 反驳连接样式
    {
      selector: 'edge[link_type = "opposes"]',
      style: {
        'line-color': themeColors.opposeColor,
        'target-arrow-color': themeColors.opposeColor,
        'line-style': 'dashed',
      },
    },
    // 选中边样式
    {
      selector: 'edge:selected',
      style: {
        'width': 5,
        'line-color': '#ff9800',
        'target-arrow-color': '#ff9800',
        'overlay-color': '#ff9800',
        'overlay-opacity': 0.2,
      },
    },
  ];
}
