import { ref, computed } from 'vue';
import { debateService } from '@/services';
import type { Debate } from '@/types';

// 全局状态
const debates = ref<Debate[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 搜索状态
const searchFilters = ref({
  title: '',
  creator: '',
});

// 计算属性
const filteredDebates = computed(() => {
  if (!searchFilters.value.title && !searchFilters.value.creator) {
    return debates.value;
  }
  
  return debates.value.filter(debate => {
    const titleMatch = !searchFilters.value.title || 
      debate.title.toLowerCase().includes(searchFilters.value.title.toLowerCase());
    const creatorMatch = !searchFilters.value.creator || 
      debate.creator.toLowerCase().includes(searchFilters.value.creator.toLowerCase());
    
    return titleMatch && creatorMatch;
  });
});

export function useDebates() {
  const fetchDebates = async () => {
    loading.value = true;
    error.value = null;
    
    try {
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

  const updateDebate = async (data: { id: string; title?: string; description?: string; creator?: string }) => {
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
    
    // 方法
    fetchDebates,
    createDebate,
    updateDebate,
    deleteDebate,
    setSearchFilters,
    clearError,
  };
}
