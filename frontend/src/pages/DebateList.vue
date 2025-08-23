<template>
  <div class="debate-list">
    <div class="page-header">
      <h1>辩论总览</h1>
      <UiButton variant="primary" @click="showCreateModal">
        新建辩论
      </UiButton>
    </div>

    <div class="search-section">
      <div class="search-inputs">
        <UiInput 
          v-model="searchFilters.title" 
          placeholder="搜索标题关键词..."
          @input="handleSearchInput"
        >
          <template #prefix>🔍</template>
        </UiInput>
        <UiInput 
          v-model="searchFilters.creator" 
          placeholder="搜索创建者..."
          @input="handleSearchInput"
        >
          <template #prefix>👤</template>
        </UiInput>
      </div>
      <UiButton variant="secondary" @click="handleSearch" :loading="loading">
        搜索
      </UiButton>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
      <UiButton variant="ghost" size="small" @click="clearError">×</UiButton>
    </div>

    <div v-if="loading" class="loading-message">
      正在加载辩论列表...
    </div>

    <div v-else-if="debates.length === 0" class="empty-state">
      <p>暂无辩论数据</p>
      <UiButton variant="primary" @click="showCreateModal">
        创建第一个辩论
      </UiButton>
    </div>

    <table v-else class="debate-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>描述</th>
          <th>创建者</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="debate in debates" :key="debate.id">
          <td :title="debate.title">{{ debate.title }}</td>
          <td :title="debate.description">{{ debate.description }}</td>
          <td :title="debate.creator">{{ debate.creator }}</td>
          <td>{{ formatDate(debate.created_at) }}</td>
          <td class="actions-cell">
            <UiButton variant="ghost" size="small" @click="viewDebate(debate.id)">
              查看
            </UiButton>
            <UiButton variant="ghost" size="small" @click="editDebate(debate)">
              编辑
            </UiButton>
            <UiButton variant="danger" size="small" @click="handleDeleteDebate(debate)">
              删除
            </UiButton>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 创建/编辑弹窗 -->
    <UiModal 
      v-model:show="showModal" 
      :title="isEditMode ? '编辑辩论' : '创建辩论'"
      size="medium"
    >
      <form @submit.prevent="handleSubmit" class="debate-form">
        <UiInput
          v-model="form.title"
          label="辩论标题"
          placeholder="请输入辩论标题..."
          required
          :error="formErrors.title"
        />

        <UiInput
          v-model="form.description"
          label="辩论描述"
          placeholder="请输入辩论描述..."
          tag="textarea"
          :rows="4"
          :error="formErrors.description"
        />

        <UiInput
          v-model="form.creator"
          label="创建者"
          placeholder="请输入创建者名称..."
          required
          :error="formErrors.creator"
        />
      </form>

      <template #footer>
        <UiButton variant="secondary" @click="closeModal">
          取消
        </UiButton>
        <UiButton 
          variant="primary" 
          @click="handleSubmit" 
          :loading="submitting"
        >
          {{ isEditMode ? '更新' : '创建' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { UiButton, UiModal, UiInput } from '@/components/ui';
import { useDebates } from '@/composables';
import type { Debate } from '@/types';

const router = useRouter();

// 使用组合函数
const {
  debates,
  loading,
  error,
  searchFilters,
  fetchDebates,
  createDebate,
  updateDebate,
  deleteDebate,
  clearError,
} = useDebates();

// 本地状态
const showModal = ref(false);
const isEditMode = ref(false);
const submitting = ref(false);

// 表单状态
const form = ref({
  id: '',
  title: '',
  description: '',
  creator: '',
});

const formErrors = ref({
  title: '',
  description: '',
  creator: '',
});

// 搜索延时器
let searchTimer: number | null = null;

// 方法
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

const showCreateModal = () => {
  isEditMode.value = false;
  form.value = {
    id: '',
    title: '',
    description: '',
    creator: localStorage.getItem('default_creator') || '',
  };
  clearFormErrors();
  showModal.value = true;
};

const editDebate = (debate: Debate) => {
  isEditMode.value = true;
  form.value = { ...debate };
  clearFormErrors();
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  clearFormErrors();
};

const clearFormErrors = () => {
  formErrors.value = {
    title: '',
    description: '',
    creator: '',
  };
};

const validateForm = () => {
  let isValid = true;
  clearFormErrors();

  if (!form.value.title.trim()) {
    formErrors.value.title = '请输入辩论标题';
    isValid = false;
  }

  if (!form.value.creator.trim()) {
    formErrors.value.creator = '请输入创建者名称';
    isValid = false;
  }

  return isValid;
};

const handleSubmit = async () => {
  if (!validateForm()) return;

  submitting.value = true;
  
  try {
    let success = false;
    
    if (isEditMode.value) {
      success = await updateDebate({
        id: form.value.id,
        title: form.value.title.trim(),
        description: form.value.description.trim(),
        creator: form.value.creator.trim(),
      });
    } else {
      const result = await createDebate({
        title: form.value.title.trim(),
        description: form.value.description.trim(),
        creator: form.value.creator.trim(),
      });
      success = !!result;
    }

    if (success) {
      // 保存创建者到本地存储
      localStorage.setItem('default_creator', form.value.creator.trim());
      closeModal();
    }
  } finally {
    submitting.value = false;
  }
};

const handleDeleteDebate = async (debate: Debate) => {
  const confirmed = confirm(`确定要删除辩论"${debate.title}"吗？`);
  if (!confirmed) return;

  await deleteDebate(debate.id);
};

const viewDebate = (debateId: string) => {
  console.log('Navigating to debate with ID:', debateId);
  router.push(`/debate/${debateId}`);
};

const handleSearchInput = () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  
  // 延迟搜索，避免频繁请求
  searchTimer = window.setTimeout(() => {
    handleSearch();
  }, 500);
};

const handleSearch = () => {
  fetchDebates();
};

// 初始化
onMounted(() => {
  fetchDebates();
});
</script>

<style scoped>
 .debate-list {
  width: 70%;
  max-width: none;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.page-header h1 {
  margin: 0;
  color: var(--text);
}

.search-section {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.search-inputs {
  display: flex;
  gap: 1rem;
  flex: 1;
}

.error-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius);
  color: #dc2626;
}

.loading-message {
  text-align: center;
  padding: 3rem;
  color: var(--text-light);
  font-size: 1.1rem;
}

.empty-state {
  text-align: center;
  padding: 4rem;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.empty-state p {
  color: var(--text-light);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.debate-table {
  width: 100%;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  border-collapse: collapse;
}

.debate-table th,
.debate-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.debate-table th {
  background: var(--secondary);
  font-weight: 600;
  color: var(--text);
}

.debate-table tr:hover {
  background: var(--secondary);
}

.debate-table tr:last-child td {
  border-bottom: none;
}

.actions-cell {
  display: flex;
  justify-content: space-evenly;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.debate-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .debate-list {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .search-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-inputs {
    flex-direction: column;
  }
  
  .debate-table {
    font-size: 0.875rem;
  }
  
  .debate-table th,
  .debate-table td {
    padding: 0.75rem 0.5rem;
  }
  
  .actions-cell {
    flex-direction: column;
  }
}
</style>
