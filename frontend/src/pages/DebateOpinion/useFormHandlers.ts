import { useNotifications } from '@/composables';
import type { OpinionFormData, LinkFormData } from '@/types';

/**
 * 表单处理逻辑
 */
export function useFormHandlers(
  createOpinion: (data: OpinionFormData) => Promise<void>,
  updateOpinion: (data: OpinionFormData) => Promise<void>,
  deleteOpinion: (opinionId: string) => Promise<void>,
  createLink: (data: LinkFormData) => Promise<void>,
  updateLink: (data: LinkFormData) => Promise<void>,
  deleteLink: (linkId: string) => Promise<void>,
  closeOpinionEditor: () => void,
  closeLinkEditor: () => void
) {
  const { notifySuccess, notifyError } = useNotifications();

  // 处理观点提交
  const handleOpinionSubmit = async (data: OpinionFormData, isEdit: boolean) => {
    try {
      if (isEdit) {
        await updateOpinion(data);
        notifySuccess('观点更新成功');
      } else {
        await createOpinion(data);
        notifySuccess('观点创建成功');
      }
      closeOpinionEditor();
    } catch (error) {
      console.error('观点操作失败:', error);
      notifyError(isEdit ? '观点更新失败' : '观点创建失败');
    }
  };

  // 处理连接提交
  const handleLinkSubmit = async (data: LinkFormData, isEdit: boolean) => {
    try {
      if (isEdit) {
        await updateLink(data);
        notifySuccess('连接更新成功');
      } else {
        await createLink(data);
        notifySuccess('连接创建成功');
      }
      closeLinkEditor();
    } catch (error) {
      console.error('连接操作失败:', error);
      notifyError(isEdit ? '连接更新失败' : '连接创建失败');
    }
  };

  // 处理观点删除
  const handleOpinionDelete = async (opinionId: string) => {
    console.log('[handleOpinionDelete] 开始处理删除观点:', opinionId);
    
    if (!confirm('确定要删除这个观点吗？')) {
      console.log('[handleOpinionDelete] 用户取消删除');
      return;
    }

    console.log('[handleOpinionDelete] 用户确认删除，调用 deleteOpinion');
    try {
      await deleteOpinion(opinionId);
      console.log('[handleOpinionDelete] 删除成功');
      notifySuccess('观点删除成功');
      closeOpinionEditor();
    } catch (error) {
      console.error('删除观点失败:', error);
      notifyError('删除观点失败');
    }
  };

  // 处理连接删除
  const handleLinkDelete = async (linkId: string) => {
    if (!confirm('确定要删除这个连接吗？')) {
      return;
    }

    try {
      await deleteLink(linkId);
      notifySuccess('连接删除成功');
      closeLinkEditor();
    } catch (error) {
      console.error('删除连接失败:', error);
      notifyError('删除连接失败');
    }
  };

  return {
    handleOpinionSubmit,
    handleLinkSubmit,
    handleOpinionDelete,
    handleLinkDelete,
  };
}
