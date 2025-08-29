import { ref, computed } from 'vue';
import { debateService } from '@/services';
import type { Debate } from '@/types';

// 全局状态
const debates = ref<Debate[]>([]);
const globalDebateId = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

// 搜索状态
const searchFilters = ref({
  title: '',
  creator: '',
});

// 计算属性 - 排序后的辩论列表，全辩论置顶
const sortedDebates = computed(() => {
  if (!globalDebateId.value) {
    return debates.value;
  }

  const globalDebate = debates.value.find((debate) => debate.id === globalDebateId.value);
  const otherDebates = debates.value.filter((debate) => debate.id !== globalDebateId.value);

  return globalDebate ? [globalDebate, ...otherDebates] : debates.value;
});

const filteredDebates = computed(() => {
  if (!searchFilters.value.title && !searchFilters.value.creator) {
    return sortedDebates.value;
  }

  return sortedDebates.value.filter((debate) => {
    const titleMatch =
      !searchFilters.value.title ||
      debate.title.toLowerCase().includes(searchFilters.value.title.toLowerCase());
    const creatorMatch =
      !searchFilters.value.creator ||
      debate.creator.toLowerCase().includes(searchFilters.value.creator.toLowerCase());

    return titleMatch && creatorMatch;
  });
});

export function useDebates() {
  const fetchGlobalDebateId = async () => {
    try {
      const response = await debateService.getGlobalDebateId();
      if (response.is_success && response.data) {
        globalDebateId.value = response.data.id;
      }
    } catch (err) {
      console.warn('获取全辩论ID失败:', err);
      // 不设置错误，因为这不是关键功能
    }
  };

  const fetchDebates = async () => {
    loading.value = true;
    error.value = null;

    try {
      // 先获取全辩论ID（如果还没有的话）
      if (!globalDebateId.value) {
        await fetchGlobalDebateId();
      }

      const response = await debateService.query({
        title: searchFilters.value.title || undefined,
        creator: searchFilters.value.creator || undefined,
      });

      if (response.is_success && response.data) {
        debates.value = response.data;
      } else {
        error.value = response.msg || '获取辩论列表失败';
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取辩论列表失败';
    } finally {
      loading.value = false;
    }
  };

  const createDebate = async (data: { title: string; description: string; creator: string }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await debateService.create(data);

      if (response.is_success) {
        await fetchDebates(); // 重新获取列表
        return response.data;
      } else {
        error.value = response.msg || '创建辩论失败';
        return null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建辩论失败';
      return null;
    } finally {
      loading.value = false;
    }
  };

  const updateDebate = async (data: {
    id: string;
    title?: string;
    description?: string;
    creator?: string;
  }) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await debateService.update(data);

      if (response.is_success) {
        await fetchDebates(); // 重新获取列表
        return true;
      } else {
        error.value = response.msg || '更新辩论失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新辩论失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const deleteDebate = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await debateService.delete(id);

      if (response.is_success) {
        await fetchDebates(); // 重新获取列表
        return true;
      } else {
        error.value = response.msg || '删除辩论失败';
        return false;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除辩论失败';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const setSearchFilters = (filters: Partial<typeof searchFilters.value>) => {
    Object.assign(searchFilters.value, filters);
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // 状态
    debates: filteredDebates,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    searchFilters: computed(() => searchFilters.value),
    globalDebateId: computed(() => globalDebateId.value),

    // 方法
    fetchDebates,
    createDebate,
    updateDebate,
    deleteDebate,
    setSearchFilters,
    clearError,
  };
}
