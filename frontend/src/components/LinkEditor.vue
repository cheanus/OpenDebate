<template>
  <div class="link-editor-overlay" @click="closeIfClickOutside">
    <div class="link-editor" @click.stop>
      <div class="editor-header">
        <h3>{{ isEdit ? '编辑连接' : '创建连接' }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <form @submit.prevent="submit" class="editor-form">
        <!-- 起始节点 -->
        <div class="form-group">
          <label for="from_id">起始观点 *</label>
          <select id="from_id" v-model="form.from_id" required>
            <option value="">请选择起始观点</option>
            <option v-for="node in availableNodes" :key="node.id" :value="node.id">
              {{ node.content?.slice(0, 60) }}...
            </option>
          </select>
        </div>

        <!-- 目标节点 -->
        <div class="form-group">
          <label for="to_id">目标观点 *</label>
          <select id="to_id" v-model="form.to_id" required>
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
        </div>

        <!-- 连接类型 -->
        <div class="form-group">
          <label>连接类型 *</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="form.link_type" value="supports" />
              支持 - 起始观点支持目标观点
            </label>
            <label>
              <input type="radio" v-model="form.link_type" value="opposes" />
              反驳 - 起始观点反驳目标观点
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">取消</button>
          <button type="submit" class="btn-submit" :disabled="isSubmitting">
            {{ isSubmitting ? '提交中...' : isEdit ? '更新' : '创建' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Edge, Node, LinkFormData } from '@/types';

const props = defineProps<{
  isEdit: boolean;
  link: Edge | null;
  availableNodes: Array<Node>;
}>();

const emit = defineEmits<{
  close: [];
  submit: [data: LinkFormData];
}>();

const form = ref<LinkFormData>({
  from_id: '',
  to_id: '',
  link_type: 'supports',
});

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
    }
  },
  { immediate: true },
);

async function submit() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const submitData = { ...form.value };
    if (props.isEdit) {
      submitData.id = (props.link as Edge).id;
    }

    emit('submit', submitData);
  } finally {
    isSubmitting.value = false;
  }
}

function closeIfClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('link-editor-overlay')) {
    emit('close');
  }
}
</script>

<style scoped>
.link-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.link-editor {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e0e7ef;
}

.editor-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #95a5a6;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #2c3e50;
}

.editor-form {
  padding: 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e7ef;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.radio-group label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-weight: normal;
  margin-bottom: 0;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e0e7ef;
}

.btn-cancel,
.btn-submit {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: #ecf0f1;
  color: #7f8c8d;
}

.btn-cancel:hover {
  background: #bdc3c7;
}

.btn-submit {
  background: #3498db;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: #2980b9;
}

.btn-submit:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}
</style>
