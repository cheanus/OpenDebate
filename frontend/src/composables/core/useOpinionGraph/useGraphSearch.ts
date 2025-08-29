import { ref, watch } from 'vue';
import { opinionService } from '@/services';
import type { Node } from '@/types';

/**
 * 图形搜索功能
 */
export function useGraphSearch(debateId: string) {
  // 搜索状态
  const searchQuery = ref<string>('');
  const searchOpinions = ref<Node[]>([]);
  const searchLoading = ref(false);

  // 搜索观点 - 使用API查询
  const searchOpinionsApi = async () => {
    if (!searchQuery.value.trim()) {
      searchOpinions.value = [];
      return;
    }

    try {
      searchLoading.value = true;
      const response = await opinionService.query({
        q: searchQuery.value.trim(),
        debate_id: debateId,
        max_num: 20,
      });

      if (response.data) {
        searchOpinions.value = response.data;
      } else {
        searchOpinions.value = [];
      }
    } catch (err) {
      console.error('搜索观点失败:', err);
      searchOpinions.value = [];
    } finally {
      searchLoading.value = false;
    }
  };

  // 监听搜索查询变化
  watch(searchQuery, () => {
    searchOpinionsApi();
  });

  // 清空搜索结果
  const clearSearch = () => {
    searchQuery.value = '';
    searchOpinions.value = [];
  };

  return {
    // 状态
    searchQuery,
    searchOpinions,
    searchLoading,
    // 方法
    searchOpinionsApi,
    clearSearch,
  };
}
