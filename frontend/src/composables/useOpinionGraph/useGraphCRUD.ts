import { ref } from 'vue';
import { opinionService, linkService } from '@/services';
import type { LogicType, LinkType } from '@/types';

/**
 * 图形 CRUD 操作
 */
export function useGraphCRUD(
  debateId: string,
  loading: ReturnType<typeof ref<boolean>>,
  error: ReturnType<typeof ref<string | null>>,
  refreshView: () => Promise<void>
) {
  
  // 创建观点
  const createOpinion = async (data: {
    logic_type: LogicType;
    content?: string;
    parent_id?: string;
    son_ids?: string[];
    link_type?: LinkType;
    positive_score?: number | null;
    is_llm_score?: boolean;
    creator: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      let response;
      if (data.logic_type === 'and') {
        response = await opinionService.createAnd({
          parent_id: data.parent_id!,
          son_ids: data.son_ids!,
          link_type: data.link_type!,
          creator: data.creator,
          debate_id: debateId,
        });
      } else {
        response = await opinionService.createOr({
          content: data.content!,
          positive_score: data.positive_score,
          is_llm_score: data.is_llm_score,
          creator: data.creator,
          debate_id: debateId,
        });
      }

      if (response.is_success) {
        await refreshView();
        return response.data;
      } else {
        error.value = response.msg || '创建观点失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建观点失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 更新观点
  const updateOpinion = async (data: {
    id: string;
    content?: string;
    positive_score?: number | null;
    is_llm_score?: boolean;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await opinionService.update({
        id: data.id,
        content: data.content,
        score: data.positive_score !== undefined ? { positive: data.positive_score } : undefined,
        is_llm_score: data.is_llm_score,
      });

      if (response.is_success) {
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '更新观点失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新观点失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 删除观点
  const deleteOpinion = async (opinionId: string) => {
    console.log('[deleteOpinion] 开始删除观点:', opinionId);
    loading.value = true;
    error.value = null;

    try {
      console.log('[deleteOpinion] 调用 API 删除观点');
      const response = await opinionService.delete({
        opinion_id: opinionId,
        debate_id: debateId,
      });
      
      console.log('[deleteOpinion] API 响应:', response);
      
      if (response.is_success) {
        console.log('[deleteOpinion] 删除成功，刷新视图');
        await refreshView();
        return true;
      } else {
        console.error('[deleteOpinion] 删除失败:', response.msg);
        error.value = response.msg || '删除观点失败';
        return false;
      }
    } catch (err) {
      console.error('[deleteOpinion] 删除异常:', err);
      error.value = err instanceof Error ? err.message : '删除观点失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 创建连接
  const createLink = async (data: {
    from_id: string;
    to_id: string;
    link_type: LinkType;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.create({
        from_id: data.from_id,
        to_id: data.to_id,
        link_type: data.link_type,
      });

      if (response.is_success) {
        await refreshView();
        return response.data;
      } else {
        error.value = response.msg || '创建连接失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建连接失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  // 更新连接
  const updateLink = async (data: {
    id: string;
    link_type: LinkType;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.update({
        id: data.id,
        link_type: data.link_type,
      });

      if (response.is_success) {
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '更新连接失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新连接失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  // 删除连接
  const deleteLink = async (linkId: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await linkService.delete({
        id: linkId,
      });
      if (response.is_success) {
        await refreshView();
        return true;
      } else {
        error.value = response.msg || '删除连接失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除连接失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  return {
    createOpinion,
    updateOpinion,
    deleteOpinion,
    createLink,
    updateLink,
    deleteLink,
  };
}
