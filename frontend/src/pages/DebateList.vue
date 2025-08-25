<template>
  <v-container class="debate-list">
    <!-- 页面标题栏 -->
    <v-row class="mb-6">
      <v-col>
        <div class="d-flex justify-space-between align-center">
          <h1 class="text-h3">辩论总览</h1>
          <v-btn color="primary" @click="showCreateModal" prepend-icon="mdi-plus"> 新建辩论 </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- 搜索区域 -->
    <v-card class="mb-6">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchFilters.title"
              label="搜索标题关键词"
              placeholder="请输入标题关键词..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              @input="handleSearchInput"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="searchFilters.creator"
              label="搜索创建者"
              placeholder="请输入创建者名称..."
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="comfortable"
              @input="handleSearchInput"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              color="primary"
              variant="outlined"
              @click="handleSearch"
              :loading="loading"
              block
            >
              搜索
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 错误提示 -->
    <v-alert v-if="error" type="error" closable @click:close="clearError" class="mb-6">
      {{ error }}
    </v-alert>

    <!-- 加载中 -->
    <v-card v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
      <p class="text-h6">正在加载辩论列表...</p>
    </v-card>

    <!-- 空状态 -->
    <v-card v-else-if="debates.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey" class="mb-4">mdi-comment-question-outline</v-icon>
      <p class="text-h6 mb-4">暂无辩论数据</p>
      <v-btn color="primary" @click="showCreateModal">创建第一个辩论</v-btn>
    </v-card>

    <!-- 辩论列表 -->
    <v-card v-else>
      <v-data-table :headers="tableHeaders" :items="debates" item-value="id" class="elevation-1">
        <template v-slot:[`item.title`]="{ item }">
          <div class="text-truncate" style="max-width: 200px" :title="item.title">
            {{ item.title }}
          </div>
        </template>

        <template v-slot:[`item.description`]="{ item }">
          <div class="text-truncate" style="max-width: 250px" :title="item.description">
            {{ item.description }}
          </div>
        </template>

        <template v-slot:[`item.created_at`]="{ item }">
          {{ formatDate(item.created_at) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <v-btn
            icon="mdi-eye"
            variant="text"
            color="primary"
            size="small"
            @click="viewDebate(item.id)"
            title="查看"
          />
          <v-btn
            icon="mdi-pencil"
            variant="text"
            color="primary"
            size="small"
            @click="editDebate(item)"
            title="编辑"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            color="error"
            size="small"
            @click="handleDeleteDebate(item)"
            title="删除"
          />
        </template>
      </v-data-table>
    </v-card>

    <!-- 创建/编辑弹窗 -->
    <v-dialog v-model="showModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditMode ? '编辑辩论' : '创建辩论' }}
        </v-card-title>

        <v-card-text>
          <v-form ref="formRef" @submit.prevent="handleSubmit">
            <v-text-field
              v-model="form.title"
              label="辩论标题"
              placeholder="请输入辩论标题..."
              variant="outlined"
              :error-messages="formErrors.title"
              required
              class="mb-4"
            />

            <v-textarea
              v-model="form.description"
              label="辩论描述"
              placeholder="请输入辩论描述..."
              variant="outlined"
              :error-messages="formErrors.description"
              rows="4"
              class="mb-4"
            />

            <v-text-field
              v-model="form.creator"
              label="创建者"
              placeholder="请输入创建者名称..."
              variant="outlined"
              :error-messages="formErrors.creator"
              required
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal"> 取消 </v-btn>
          <v-btn color="primary" @click="handleSubmit" :loading="submitting" variant="elevated">
            {{ isEditMode ? '更新' : '创建' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
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

// 表格头信息
const tableHeaders = [
  { title: '标题', key: 'title', sortable: false },
  { title: '描述', key: 'description', sortable: false },
  { title: '创建者', key: 'creator', sortable: false },
  { title: '创建时间', key: 'created_at', sortable: false },
  { title: '操作', key: 'actions', sortable: false, align: 'center' as const },
];

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
  max-width: 1200px;
  margin: 0 auto;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
