<template>
  <v-dialog v-model="isVisible" max-width="800px">
    <v-card>
      <v-card-title class="text-h5">
        <v-icon left>{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
        {{ isEdit ? '编辑观点' : '创建观点' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form @submit.prevent="handleSubmit">
          <!-- 观点类型 -->
          <div class="mb-6">
            <h4 class="text-h6 mb-3">观点类型</h4>
            <v-radio-group v-model="form.logic_type" inline>
              <v-radio label="或观点（独立观点）" value="or" />
              <v-radio label="与观点（组合观点）" value="and" />
            </v-radio-group>
          </div>

          <!-- 或观点内容 -->
          <div v-if="form.logic_type === 'or'" class="mb-6">
            <v-textarea
              v-model="form.content"
              label="观点内容"
              placeholder="请输入观点内容..."
              variant="outlined"
              rows="4"
              required
              :error-messages="formErrors.content"
            />
          </div>

          <!-- 与观点的父节点和子节点选择 -->
          <div v-if="form.logic_type === 'and'" class="mb-6">
            <v-autocomplete
              v-model="form.parent_id"
              :items="solidNodesForSelect"
              item-title="title"
              item-value="value"
              label="父观点"
              placeholder="搜索或选择父观点"
              variant="outlined"
              required
              :error-messages="formErrors.parent_id"
              class="mb-4"
              clearable
            />
            <v-autocomplete
              v-model="form.son_ids"
              :items="solidSonNodesForSelect"
              item-title="title"
              item-value="value"
              label="子观点"
              placeholder="搜索或选择子观点"
              variant="outlined"
              multiple
              chips
              closable-chips
              :error-messages="formErrors.son_ids"
              class="mb-4"
              clearable
            />

            <h5 class="text-subtitle-1 mb-3">连接类型</h5>
            <v-radio-group v-model="form.link_type" inline>
              <v-radio label="支持 - 与观点支持父观点" value="supports" />
              <v-radio label="反驳 - 与观点反驳父观点" value="opposes" />
            </v-radio-group>
          </div>

          <!-- 正证分数（仅或观点） -->
          <div v-if="form.logic_type === 'or' && isEdit && isLeafNode" class="mb-6">
            <v-text-field
              v-model.number="form.positive_score"
              label="正证分数 (0-1)"
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="可选，如0.7"
              variant="outlined"
            />
            <v-checkbox v-if="isEdit" v-model="form.is_llm_score" label="使用AI自动评分" />
          </div>

          <!-- 创建者 -->
          <div class="mb-6">
            <v-text-field
              v-model="form.creator"
              label="创建者"
              placeholder="请输入创建者名称..."
              variant="outlined"
              required
              :error-messages="formErrors.creator"
            />
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close"> 取消 </v-btn>
        <v-btn color="primary" @click="handleSubmit" :loading="submitting" variant="elevated">
          {{ isEdit ? '更新' : '创建' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useOpinionForm } from '@/composables/features/opinion/useOpinionForm';
import type { Node, OpinionFormData } from '@/types';

interface Props {
  isEdit: boolean;
  opinion: Node | null;
  debateId: string;
  availableNodes: Node[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submit: [data: OpinionFormData, callback: () => void];
  close: [];
}>();

// 与观点可选节点过滤
const solidNodes = computed(() => {
  return props.availableNodes.filter((node) => node.node_type === 'solid');
});

const solidSonNodes = computed(() => {
  return solidNodes.value.filter((node) => {
    // 排除自己
    if (props.opinion && node.id === props.opinion.id) {
      return false;
    }
    return true;
  });
});

// 为 v-autocomplete 转换数据格式
const solidNodesForSelect = computed(() => {
  return solidNodes.value.map((node) => ({
    title: node.content,
    value: node.id,
  }));
});

const solidSonNodesForSelect = computed(() => {
  return solidSonNodes.value.map((node) => ({
    title: node.content,
    value: node.id,
  }));
});

// 表单状态管理
const { form, formErrors, submitting, initializeForm, validateForm, resetForm } = useOpinionForm();

// 显示状态
const isVisible = computed({
  get: () => true,
  set: (value) => {
    if (!value) {
      close();
    }
  },
});

const isLeafNode = computed(() => {
  if (props.opinion) {
    return (
      !props.opinion.relationship.opposed_by.length &&
      !props.opinion.relationship.supported_by.length
    );
  }
  return false;
});

// 处理提交
const handleSubmit = () => {
  if (!validateForm()) {
    return;
  }

  submitting.value = true;
  const formData = {
    ...form,
    debate_id: props.debateId,
  };

  emit('submit', formData, () => {
    submitting.value = false;
  });
};

// 关闭对话框
const close = () => {
  resetForm();
  emit('close');
};

// 监听编辑状态变化
watch(
  () => props.opinion,
  (newOpinion) => {
    if (newOpinion && props.isEdit) {
      initializeForm(newOpinion);
    } else {
      resetForm();
    }
  },
  { immediate: true },
);
</script>
