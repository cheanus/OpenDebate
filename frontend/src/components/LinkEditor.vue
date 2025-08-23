<template>
  <UiModal 
    v-model:show="isVisible" 
    :title="isEdit ? '编辑连接' : '创建连接'"
    size="medium"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="link-form">
      <!-- 起始节点 -->
      <div class="form-group">
        <label for="from-select">起始观点 *</label>
        <select 
          id="from-select" 
          v-model="form.from_id" 
          required 
          class="select-input"
          :class="{ 'error': formErrors.from_id }"
        >
          <option value="">请选择起始观点</option>
          <option v-for="node in availableNodes" :key="node.id" :value="node.id">
            {{ node.content?.slice(0, 60) }}...
          </option>
        </select>
        <span v-if="formErrors.from_id" class="error-text">{{ formErrors.from_id }}</span>
      </div>

      <!-- 目标节点 -->
      <div class="form-group">
        <label for="to-select">目标观点 *</label>
        <select 
          id="to-select" 
          v-model="form.to_id" 
          required 
          class="select-input"
          :class="{ 'error': formErrors.to_id }"
        >
          <option value="">请选择目标观点</option>
          <option
            v-for="node in availableNodes"
            :key="node.id"
            :value="node.id"
            :disabled="node.id === form.from_id"
          >
            {{ node.content?.slice(0, 60) }}...
          </option>
        </select>
        <span v-if="formErrors.to_id" class="error-text">{{ formErrors.to_id }}</span>
      </div>

      <!-- 连接类型 -->
      <div class="form-group">
        <label>连接类型 *</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="form.link_type" value="supports" />
            <span class="radio-content">
              <strong>支持</strong>
              <small>起始观点支持目标观点</small>
            </span>
          </label>
          <label class="radio-label">
            <input type="radio" v-model="form.link_type" value="opposes" />
            <span class="radio-content">
              <strong>反驳</strong>
              <small>起始观点反驳目标观点</small>
            </span>
          </label>
        </div>
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
import { ref, watch, computed } from 'vue';
import { UiButton, UiModal } from './ui';
import type { Edge, Node, LinkFormData, LinkType } from '@/types';

interface Props {
  isEdit: boolean;
  link: Edge | null;
  availableNodes: Array<Node>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  submit: [data: LinkFormData];
}>();

// 显示控制
const isVisible = ref(true);

// 表单数据
const form = ref<LinkFormData>({
  from_id: '',
  to_id: '',
  link_type: 'supports' as LinkType,
});

// 表单错误
const formErrors = ref({
  from_id: '',
  to_id: '',
});

// 提交状态
const isSubmitting = ref(false);

// 监听编辑模式下的连接数据变化
watch(
  () => props.link,
  (newLink) => {
    if (props.isEdit && newLink) {
      form.value = {
        from_id: newLink.from_id || '',
        to_id: newLink.to_id || '',
        link_type: newLink.link_type || 'supports',
      };
    } else {
      // 重置为创建模式的默认值
      form.value = {
        from_id: '',
        to_id: '',
        link_type: 'supports',
      };
    }
    clearFormErrors();
  },
  { immediate: true },
);

// 清除表单错误
const clearFormErrors = () => {
  formErrors.value = {
    from_id: '',
    to_id: '',
  };
};

// 表单验证
const validateForm = (): boolean => {
  clearFormErrors();
  let isValid = true;

  if (!form.value.from_id) {
    formErrors.value.from_id = '请选择起始观点';
    isValid = false;
  }

  if (!form.value.to_id) {
    formErrors.value.to_id = '请选择目标观点';
    isValid = false;
  }

  if (form.value.from_id === form.value.to_id && form.value.from_id) {
    formErrors.value.to_id = '目标观点不能与起始观点相同';
    isValid = false;
  }

  return isValid;
};

// 处理提交
const handleSubmit = async () => {
  if (!validateForm()) return;

  isSubmitting.value = true;
  
  try {
    const submitData = { ...form.value };
    if (props.isEdit && props.link) {
      submitData.id = props.link.id;
    }

    emit('submit', submitData);
  } finally {
    isSubmitting.value = false;
  }
};

// 处理关闭
const handleClose = () => {
  isVisible.value = false;
  emit('close');
};
</script>

<style scoped>
.link-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.select-input.error {
  border-color: #ef4444;
}

.select-input option:disabled {
  color: var(--text-light);
  background-color: var(--secondary);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio-label:hover {
  background-color: var(--secondary);
  border-color: var(--primary);
}

.radio-label:has(input:checked) {
  background-color: rgba(37, 99, 235, 0.1);
  border-color: var(--primary);
}

.radio-label input {
  margin: 0;
  margin-top: 0.125rem;
}

.radio-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.radio-content strong {
  color: var(--text);
  font-weight: 600;
}

.radio-content small {
  color: var(--text-light);
  font-size: 0.75rem;
}

.error-text {
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .link-form {
    gap: 1rem;
  }
  
  .radio-label {
    padding: 0.75rem;
  }
}
</style>
