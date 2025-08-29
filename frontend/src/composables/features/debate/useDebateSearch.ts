import { ref } from 'vue';

/**
 * 搜索功能管理
 */
export function useDebateSearch() {
  const selectedSearchOpinion = ref<string | null>(null);
  let searchTimer: number | null = null;

  // 处理搜索输入
  const handleSearchInput = async (
    searchValue: string | null,
    searchCallback: (query: string) => Promise<void>,
  ) => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 延迟搜索，避免频繁请求
    searchTimer = window.setTimeout(async () => {
      if (searchCallback) {
        await searchCallback(searchValue || '');
      }
    }, 300);
  };

  // 处理搜索选择
  const handleSearchSelection = async (
    opinionId: string | null,
    focusCallback?: (id: string) => Promise<void>,
  ) => {
    selectedSearchOpinion.value = opinionId;

    if (opinionId && focusCallback) {
      try {
        await focusCallback(opinionId);
      } catch (error) {
        console.error('定位观点失败:', error);
      }
    }
  };

  // 清理定时器
  const clearSearchTimer = () => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
  };

  return {
    selectedSearchOpinion,
    handleSearchInput,
    handleSearchSelection,
    clearSearchTimer,
  };
}
