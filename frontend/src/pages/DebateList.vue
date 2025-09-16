<template>
  <v-container class="debate-list">
    <!-- 页面标题栏 -->
    <v-row class="mb-6">
      <v-col>
        <div class="d-flex justify-space-between align-center">
          <h1 class="text-h3">辩论总览</h1>
          <v-btn
            v-if="roleLevel >= ROLELEVEL.user"
            color="primary"
            @click="showCreateModal"
            prepend-icon="mdi-plus"
          >
            新建辩论
          </v-btn>
        </div>
      </v-col>
    </v-row>

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
      <v-btn v-if="roleLevel >= ROLELEVEL.user" color="primary" @click="showCreateModal"
        >创建第一个辩论</v-btn
      >
    </v-card>

    <!-- 辩论列表 -->
    <v-card v-else>
      <v-data-table :headers="tableHeaders" :items="debates" item-value="id" class="elevation-1">
        <template v-slot:[`item.title`]="{ item }">
          <div class="d-flex align-center">
            <v-chip
              v-if="item.id === globalDebateId"
              size="small"
              color="primary"
              variant="elevated"
              class="mr-2"
            >
              全辩论
            </v-chip>
            <div class="text-truncate" style="max-width: 200px" :title="item.title">
              {{ item.title }}
            </div>
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
            v-if="roleLevel >= ROLELEVEL.admin"
            icon="mdi-pencil"
            variant="text"
            color="primary"
            size="small"
            @click="editDebate(item)"
            title="编辑"
          />
          <v-btn
            v-if="item.id !== globalDebateId && roleLevel >= ROLELEVEL.admin"
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

    <!-- 简化的创建/编辑弹窗 -->
    <v-dialog v-model="showModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="text-h5">
          {{ isEditMode ? '编辑辩论' : '创建辩论' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="辩论标题" variant="outlined" class="mb-4" />
          <v-textarea
            v-model="form.description"
            label="辩论描述"
            variant="outlined"
            rows="4"
            class="mb-4"
          />
          <v-text-field v-model="form.creator" label="创建者" variant="outlined" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeModal"> 取消 </v-btn>
          <v-btn color="primary" @click="handleSubmit" :loading="submitting">
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
import { formatDate } from '@/utils';
import { useAuth, ROLELEVEL } from '@/composables/core/useAuth';
import type { Debate } from '@/types';

const router = useRouter();

// 使用组合函数
const {
  debates,
  loading,
  error,
  globalDebateId,
  fetchDebates,
  createDebate,
  updateDebate,
  deleteDebate,
  clearError,
} = useDebates();

const { roleLevel } = useAuth();

// 表单状态
const showModal = ref(false);
const isEditMode = ref(false);
const submitting = ref(false);
const form = ref({
  id: '',
  title: '',
  description: '',
  creator: '',
});

// 表格配置
const tableHeaders = [
  { title: '标题', key: 'title', align: 'start' as const },
  { title: '描述', key: 'description', align: 'start' as const },
  { title: '创建者', key: 'creator', align: 'start' as const },
  { title: '创建时间', key: 'created_at', align: 'start' as const },
  { title: '操作', key: 'actions', align: 'center' as const, sortable: false },
];

// 显示创建弹窗
const showCreateModal = () => {
  isEditMode.value = false;
  form.value = { id: '', title: '', description: '', creator: '' };
  showModal.value = true;
};

// 编辑辩论
const editDebate = (debate: Debate) => {
  isEditMode.value = true;
  form.value = { ...debate };
  showModal.value = true;
};

// 关闭弹窗
const closeModal = () => {
  showModal.value = false;
  form.value = { id: '', title: '', description: '', creator: '' };
};

// 处理提交
const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (isEditMode.value) {
      await updateDebate(form.value);
    } else {
      await createDebate(form.value);
    }
    closeModal();
    await fetchDebates();
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    submitting.value = false;
  }
};

// 删除辩论
const handleDeleteDebate = async (debate: Debate) => {
  if (!confirm(`确定要删除辩论"${debate.title}"吗？`)) {
    return;
  }

  try {
    await deleteDebate(debate.id);
    await fetchDebates();
  } catch (error) {
    console.error('删除失败:', error);
  }
};

// 查看辩论
const viewDebate = (debateId: string) => {
  router.push(`/debate/${debateId}`);
};

// 初始化
onMounted(async () => {
  await fetchDebates();
});
</script>

<style scoped>
.debate-list {
  max-width: 1200px;
}
</style>
