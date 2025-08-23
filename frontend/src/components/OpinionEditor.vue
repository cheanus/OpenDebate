<template>
  <UiModal 
    v-model:show="isVisible" 
    :title="isEdit ? '编辑观点' : '创建观点'"
    size="large"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="opinion-form">
      <!-- 观点类型 -->
      <div class="form-section">
        <h4>观点类型</h4>
        <div class="radio-group">
          <label>
            <input type="radio" v-model="form.logic_type" value="or" />
            <span>或观点（独立观点）</span>
          </label>
          <label>
            <input type="radio" v-model="form.logic_type" value="and" />
            <span>与观点（组合观点）</span>
          </label>
        </div>
      </div>

      <!-- 或观点内容 -->
      <div v-if="form.logic_type === 'or'" class="form-section">
        <UiInput
          v-model="form.content"
          label="观点内容"
          placeholder="请输入观点内容..."
          tag="textarea"
          :rows="4"
          required
          :error="formErrors.content"
        />
      </div>

      <!-- 与观点的父节点和子节点选择 -->
      <div v-if="form.logic_type === 'and'" class="form-section">
        <div class="form-group">
          <label for="parent-select">父观点 *</label>
          <select 
            id="parent-select" 
            v-model="form.parent_id" 
            required 
            class="select-input"
          >
            <option value="">请选择父观点</option>
            <option v-for="node in availableNodes" :key="node.id" :value="node.id">
              {{ node.content?.slice(0, 50) }}...
            </option>
          </select>
          <span v-if="formErrors.parent_id" class="error-text">{{ formErrors.parent_id }}</span>
        </div>

        <div class="form-group">
          <label>子观点 *</label>
          <div class="checkbox-group">
            <label v-for="node in availableNodes" :key="node.id" class="checkbox-label">
              <input
                type="checkbox"
                :value="node.id"
                v-model="form.son_ids"
                :disabled="node.id === form.parent_id"
              />
              <span>{{ node.content?.slice(0, 40) }}...</span>
            </label>
          </div>
          <span v-if="formErrors.son_ids" class="error-text">{{ formErrors.son_ids }}</span>
        </div>

        <div class="form-group">
          <label>连接类型 *</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="form.link_type" value="supports" />
              <span>支持 - 子观点支持父观点</span>
            </label>
            <label>
              <input type="radio" v-model="form.link_type" value="opposes" />
              <span>反驳 - 子观点反驳父观点</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 正证分数（仅或观点） -->
      <div v-if="form.logic_type === 'or'" class="form-section">
        <UiInput
          v-model.number="positiveScoreString"
          label="正证分数 (0-1)"
          type="number"
          min="0"
          max="1"
          step="0.01"
          placeholder="可选，如0.7"
        />
      </div>

      <!-- AI评分选项（仅或观点） -->
      <div v-if="form.logic_type === 'or'" class="form-section">
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.is_llm_score" />
          <span>使用AI自动评分</span>
        </label>
      </div>

      <!-- 创建者 -->
      <div class="form-section">
        <UiInput
          v-model="form.creator"
          label="创建者"
          placeholder="请输入创建者名称"
          required
          :error="formErrors.creator"
        />
      </div>
    </form>

    <template #footer>
      <UiButton variant="secondary" @click="handleClose">
        取消
      </UiButton>
      <UiButton 
        variant="primary" 
        @click="handleSubmit" 
        :loading="isSubmitting"
      >
        {{ isEdit ? '更新' : '创建' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { UiButton, UiModal, UiInput } from './ui';
import type { Node, OpinionFormData, LogicType, LinkType } from '@/types';

interface Props {
  isEdit: boolean;
  opinion: Node | null;
  debateId: string;
  availableNodes: Array<Node>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [data: OpinionFormData];
}>();

// 显示控制
const isVisible = ref(true);

// 表单数据
const form = ref<OpinionFormData>({
  logic_type: 'or' as LogicType,
  content: '',
  parent_id: '',
  son_ids: [],
  link_type: 'supports' as LinkType,
  positive_score: null,
  is_llm_score: false,
  creator: '',
});

// 表单错误
const formErrors = ref({
  content: '',
  parent_id: '',
  son_ids: '',
  creator: '',
});

// 提交状态
const isSubmitting = ref(false);

// 处理 positive_score 的类型转换
const positiveScoreString = computed({
  get: () => form.value.positive_score?.toString() || '',
  set: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    form.value.positive_score = isNaN(numValue) ? null : numValue;
  }
});

// 监听编辑模式下的观点数据变化
watch(
  () => props.opinion,
  (newOpinion) => {
    if (props.isEdit && newOpinion) {
      form.value = {
        logic_type: newOpinion.logic_type || 'or',
        content: newOpinion.content || '',
        parent_id: '',
        son_ids: [],
        link_type: 'supports',
        positive_score: newOpinion.score?.positive || null,
        is_llm_score: false,
        creator: newOpinion.creator || '',
      };
    } else {
      // 重置为创建模式的默认值
      form.value = {
        logic_type: 'or',
        content: '',
        parent_id: '',
        son_ids: [],
        link_type: 'supports',
        positive_score: null,
        is_llm_score: false,
        creator: localStorage.getItem('default_creator') || '',
      };
    }
    clearFormErrors();
  },
  { immediate: true },
);

// 清除表单错误
const clearFormErrors = () => {
  formErrors.value = {
    content: '',
    parent_id: '',
    son_ids: '',
    creator: '',
  };
};

// 表单验证
const validateForm = (): boolean => {
  clearFormErrors();
  let isValid = true;

  // 验证创建者
  if (!form.value.creator.trim()) {
    formErrors.value.creator = '请输入创建者名称';
    isValid = false;
  }

  // 验证或观点的内容
  if (form.value.logic_type === 'or') {
    if (!form.value.content.trim()) {
      formErrors.value.content = '请输入观点内容';
      isValid = false;
    }
  }

  // 验证与观点的父节点和子节点
  if (form.value.logic_type === 'and') {
    if (!form.value.parent_id) {
      formErrors.value.parent_id = '请选择父观点';
      isValid = false;
    }

    if (!form.value.son_ids || form.value.son_ids.length === 0) {
      formErrors.value.son_ids = '请至少选择一个子观点';
      isValid = false;
    }
  }

  return isValid;
};

// 处理提交
const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;
  
  try {
    const submitData = { ...form.value };
    if (props.debateId) {
      submitData.debate_id = props.debateId;
    }

    if (props.isEdit && props.opinion) {
      submitData.id = props.opinion.id;
      // 编辑时只发送修改的字段
      const patchData = {
        id: props.opinion.id,
        content: form.value.content,
        creator: form.value.creator,
        ...(form.value.positive_score !== null && {
          score: { positive: form.value.positive_score }
        }),
        ...(form.value.is_llm_score && { is_llm_score: true }),
      };

      emit('submit', patchData as OpinionFormData);
    } else {
      emit('submit', submitData);
    }
  } finally {
    isSubmitting.value = false;
  }
};

// 处理关闭
const handleClose = () => {
  isVisible.value = false;
  emit('close');
};

// 初始化
onMounted(() => {
  // 默认创建者可以从localStorage获取或设为默认值
  if (!form.value.creator) {
    form.value.creator = localStorage.getItem('default_creator') || 'user';
  }
});
</script>

<style scoped>
.opinion-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section h4 {
  margin: 0;
  color: var(--text);
  font-size: 1rem;
  font-weight: 600;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-group label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius);
  transition: background-color 0.2s ease;
}

.radio-group label:hover,
.checkbox-label:hover {
  background-color: var(--secondary);
}

.radio-group input,
.checkbox-label input {
  margin: 0;
}

.select-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.select-input:focus {
  outline: none;
  border-color: var(--primary);
}

.checkbox-group {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
  background: var(--card-bg);
}

.checkbox-group .checkbox-label {
  margin: 0;
  padding: 0.5rem;
}

.error-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .opinion-form {
    gap: 1rem;
  }
  
  .form-section {
    gap: 0.75rem;
  }
  
  .checkbox-group {
    max-height: 150px;
  }
}
</style>
