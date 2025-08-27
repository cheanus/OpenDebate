import { ref } from 'vue';
import type { Node, Edge } from '@/types';
import type { NodeSingular, EdgeSingular } from 'cytoscape';

/**
 * 右键菜单管理
 */
export function useContextMenu() {
  const showContextMenu = ref(false);
  const contextMenuStyle = ref<Record<string, string>>({});
  const contextMenuType = ref('');
  const selectedNode = ref<NodeSingular | null>(null);
  const selectedNodeData = ref<Partial<Node>>({});
  const selectedEdge = ref<EdgeSingular | null>(null);
  const selectedEdgeData = ref<Partial<Edge>>({});
  const metaPanelStyle = ref<Record<string, string>>({});
  const edgeMetaPanelStyle = ref<Record<string, string>>({});

  // 设置右键菜单位置和类型
  const setContextMenu = (x: number, y: number, type: string) => {
    contextMenuStyle.value = {
      left: `${x}px`,
      top: `${y}px`,
    };
    contextMenuType.value = type;
    showContextMenu.value = true;
  };

  // 隐藏右键菜单
  const hideContextMenu = () => {
    showContextMenu.value = false;
  };

  // 设置选中的节点
  const setSelectedNode = (node: NodeSingular | null, renderedPosition?: { x: number; y: number }) => {
    selectedNode.value = node;
    
    if (node) {
      const data = node.data();
      selectedNodeData.value = {
        id: data.id,
        created_at: data.created_at,
        creator: data.creator,
        content: data.content,
        host: data.host,
        logic_type: data.logic_type,
        node_type: data.node_type,
        score: data.score
      };
      
      if (renderedPosition) {
        metaPanelStyle.value = {
          left: `${renderedPosition.x + 10}px`,
          top: `${renderedPosition.y - 50}px`,
        };
      }
    } else {
      selectedNodeData.value = {};
      metaPanelStyle.value = {};
    }
  };

  // 设置选中的边
  const setSelectedEdge = (edge: EdgeSingular | null, renderedPosition?: { x: number; y: number }) => {
    selectedEdge.value = edge;
    
    if (edge) {
      selectedEdgeData.value = edge.data();
      
      if (renderedPosition) {
        edgeMetaPanelStyle.value = {
          left: `${renderedPosition.x + 10}px`,
          top: `${renderedPosition.y - 30}px`,
        };
      }
    } else {
      selectedEdgeData.value = {};
      edgeMetaPanelStyle.value = {};
    }
  };

  // 处理菜单动作
  const handleMenuAction = (action: string, emit: (event: 'contextMenuAction', action: string) => void) => {
    hideContextMenu();
    emit('contextMenuAction', action);
  };

  return {
    // 状态
    showContextMenu,
    contextMenuStyle,
    contextMenuType,
    selectedNode,
    selectedNodeData,
    selectedEdge,
    selectedEdgeData,
    metaPanelStyle,
    edgeMetaPanelStyle,
    
    // 方法
    setContextMenu,
    hideContextMenu,
    setSelectedNode,
    setSelectedEdge,
    handleMenuAction,
  };
}
