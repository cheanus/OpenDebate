import { type Ref } from 'vue';
import type { Node, Edge } from '@/types';

// 右键菜单动作类型
export type ContextMenuAction = 
  | 'editOpinion'
  | 'deleteOpinion'
  | 'addOpinion'
  | 'addLink'
  | 'editLink'
  | 'deleteLink'
  | 'refreshView'
  | 'fitToScreen';

/**
 * 右键菜单动作处理
 */
export function useContextMenuActions(
  selectedNode: Ref<Node | null>,
  selectedEdge: Ref<Edge | null>,
  openOpinionEditor: (isEdit?: boolean) => void,
  openLinkEditor: (isEdit?: boolean) => void,
  handleOpinionDelete: (opinionId: string) => Promise<void>,
  handleLinkDelete: (linkId: string) => Promise<void>,
  refreshView: () => Promise<void>,
  fitToView: () => void
) {
  
  // 处理右键菜单动作
  const handleContextMenuAction = async (action: string) => {
    // 类型检查：确保action是有效的菜单动作
    const validActions: readonly string[] = [
      'editOpinion', 'deleteOpinion', 'addOpinion', 'addLink', 
      'editLink', 'deleteLink', 'refreshView', 'fitToScreen'
    ];
    
    if (!validActions.includes(action)) {
      console.warn('未知的菜单动作:', action);
      return;
    }

    switch (action as ContextMenuAction) {
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
