import { ref } from 'vue';
import { useNotifications } from '@/composables';

/**
 * CRUD 操作修复和优化
 * 解决空辩论新建观点后不显示和删除观点后仍显示的问题
 */
export function useCRUDFixes() {
  const { notifySuccess, notifyError } = useNotifications();
  const isUpdating = ref(false);

  /**
   * 包装 CRUD 操作以提供一致的错误处理和状态管理
   */
  const wrapCRUDOperation = async <T>(
    operation: () => Promise<T>,
    successMessage: string,
    errorMessage: string,
    postOperation?: () => Promise<void>,
  ): Promise<T | null> => {
    if (isUpdating.value) {
      console.warn('[wrapCRUDOperation] 操作正在进行中，忽略重复请求');
      return null;
    }

    isUpdating.value = true;

    try {
      const result = await operation();

      // 检查操作结果，null 或 false 表示操作失败
      if (result === null || result === false) {
        console.error('[wrapCRUDOperation] 操作返回失败结果:', result);
        notifyError(errorMessage);
        return null;
      }

      if (postOperation) {
        await postOperation();
      }

      notifySuccess(successMessage);
      return result;
    } catch (error) {
      console.error('[wrapCRUDOperation] 操作异常:', error);
      notifyError(errorMessage);
      return null;
    } finally {
      isUpdating.value = false;
    }
  };

  return {
    wrapCRUDOperation,
    isUpdating,
  };
}
