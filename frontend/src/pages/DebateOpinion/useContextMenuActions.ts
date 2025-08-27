import type { Node, Edge } from '@/types';

/**
 * 右键菜单动作处理
 */
export function useContextMenuActions(
  selectedNode: any,
  selectedEdge: any,
  openOpinionEditor: (isEdit?: boolean) => void,
  openLinkEditor: (isEdit?: boolean) => void,
  handleOpinionDelete: (opinionId: string) => Promise<void>,
  handleLinkDelete: (linkId: string) => Promise<void>,
  refreshView: () => Promise<void>,
  fitToView: () => void
) {
  
  // 处理右键菜单动作
  const handleContextMenuAction = async (action: string) => {
    switch (action) {
      case 'editOpinion':
        if (selectedNode.value) {
          openOpinionEditor(true);
        }
        break;
        
      case 'deleteOpinion':
        console.log('[contextMenu] 删除观点动作被触发');
        console.log('[contextMenu] 选中的节点:', selectedNode.value);
        if (selectedNode.value) {
          console.log('[contextMenu] 调用 handleOpinionDelete, ID:', selectedNode.value.id);
          await handleOpinionDelete(selectedNode.value.id);
        } else {
          console.warn('[contextMenu] 没有选中的节点');
        }
        break;
        
      case 'addOpinion':
        openOpinionEditor(false);
        break;
        
      case 'addLink':
        openLinkEditor(false);
        break;
        
      case 'editLink':
        if (selectedEdge.value) {
          openLinkEditor(true);
        }
        break;
        
      case 'deleteLink':
        if (selectedEdge.value) {
          await handleLinkDelete(selectedEdge.value.id);
        }
        break;
        
      case 'refreshView':
        try {
          await refreshView();
        } catch (error) {
          console.error('刷新视图失败:', error);
        }
        break;
        
      case 'fitToScreen':
        fitToView();
        break;
        
      default:
        console.warn('未知的菜单动作:', action);
    }
  };

  return {
    handleContextMenuAction,
  };
}
