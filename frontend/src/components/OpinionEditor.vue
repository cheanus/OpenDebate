<template>
  <div class="opinion-editor-overlay" @click="closeIfClickOutside">
    <div class="opinion-editor" @click.stop>
      <div class="editor-header">
        <h3>{{ isEdit ? '编辑观点' : '创建观点' }}</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <form @submit.prevent="submit" class="editor-form">
        <!-- 观点类型 -->
        <div class="form-group">
          <label>观点类型</label>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="form.logic_type" value="or" />
              或观点（独立观点）
            </label>
            <label>
              <input type="radio" v-model="form.logic_type" value="and" />
              与观点（组合观点）
            </label>
          </div>
        </div>

        <!-- 观点内容 -->
        <div class="form-group" v-if="form.logic_type === 'or'">
          <label for="content">观点内容 *</label>
          <textarea
            id="content"
            v-model="form.content"
            placeholder="请输入观点内容..."
            rows="4"
            required
          ></textarea>
        </div>

        <!-- 与观点的父节点和子节点选择 -->
        <div v-if="form.logic_type === 'and'">
          <div class="form-group">
            <label>父观点</label>
            <select v-model="form.parent_id" required>
              <option value="">请选择父观点</option>
              <option v-for="node in availableNodes" :key="node.id" :value="node.id">
                {{ node.content?.slice(0, 50) }}...
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>子观点</label>
            <div class="checkbox-group">
              <label v-for="node in availableNodes" :key="node.id">
                <input
                  type="checkbox"
                  :value="node.id"
                  v-model="form.son_ids"
                  :disabled="node.id === form.parent_id"
                />
                {{ node.content?.slice(0, 40) }}...
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>连接类型</label>
            <div class="radio-group">
              <label>
                <input type="radio" v-model="form.link_type" value="supports" />
                支持
              </label>
              <label>
                <input type="radio" v-model="form.link_type" value="opposes" />
                反驳
              </label>
            </div>
          </div>
        </div>

        <!-- 正证分数 -->
        <div class="form-group" v-if="form.logic_type === 'or'">
          <label for="positive_score">正证分数 (0-1)</label>
          <input
            type="number"
            id="positive_score"
            v-model.number="form.positive_score"
            min="0"
            max="1"
            step="0.01"
            placeholder="可选，如0.7"
          />
        </div>

        <!-- AI评分选项 -->
        <div class="form-group" v-if="form.logic_type === 'or'">
          <label>
            <input type="checkbox" v-model="form.is_llm_score" />
            使用AI自动评分
          </label>
        </div>

        <!-- 创建者 -->
        <div class="form-group">
          <label for="creator">创建者 *</label>
          <input
            type="text"
            id="creator"
            v-model="form.creator"
            placeholder="请输入创建者名称"
            required
          />
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
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  isEdit: Boolean,
  opinion: Object,
  debateId: String,
  availableNodes: Array,
});

const emit = defineEmits(['close', 'submit']);

const form = ref({
  logic_type: 'or',
  content: '',
  parent_id: '',
  son_ids: [],
  link_type: 'supports',
  positive_score: null,
  is_llm_score: false,
  creator: '',
});

const isSubmitting = ref(false);

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
    }
  },
  { immediate: true },
);

async function submit() {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  try {
    const submitData = { ...form.value };
    if (props.debateId) {
      submitData.debate_id = props.debateId;
    }

    if (props.isEdit) {
      submitData.id = props.opinion.id;
      // 编辑时只发送修改的字段
      const patchData = {
        id: props.opinion.id,
        content: form.value.content,
        creator: form.value.creator,
      };
      if (form.value.positive_score !== null) {
        patchData.score = { positive: form.value.positive_score };
      }
      if (form.value.is_llm_score) {
        patchData.is_llm_score = true;
      }

      emit('submit', patchData);
    } else {
      emit('submit', submitData);
    }
  } finally {
    isSubmitting.value = false;
  }
}

function closeIfClickOutside(event) {
  if (event.target.classList.contains('opinion-editor-overlay')) {
    emit('close');
  }
}

onMounted(() => {
  // 默认创建者可以从localStorage获取或设为默认值
  if (!form.value.creator) {
    form.value.creator = localStorage.getItem('default_creator') || 'user';
  }
});
</script>

<style scoped>
.opinion-editor-overlay {
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

.opinion-editor {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 600px;
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

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e7ef;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3498db;
}

.radio-group {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
  margin-bottom: 0;
}

.checkbox-group {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e7ef;
  border-radius: 8px;
  padding: 12px;
}

.checkbox-group label {
  display: block;
  padding: 8px 0;
  font-weight: normal;
  margin-bottom: 0;
}

.checkbox-group input {
  width: auto;
  margin-right: 8px;
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
