<template>
  <v-form @submit.prevent="handleSubmit">
    <!-- 观点类型 -->
    <div class="mb-6">
      <h4 class="text-h6 mb-3">观点类型</h4>
      <v-radio-group :model-value="form.logic_type" @update:model-value="updateField('logic_type', $event)" inline>
        <v-radio label="或观点（独立观点）" value="or" />
        <v-radio label="与观点（组合观点）" value="and" />
      </v-radio-group>
    </div>

    <!-- 或观点内容 -->
    <div v-if="form.logic_type === 'or'" class="mb-6">
      <v-textarea
        :model-value="form.content"
        @update:model-value="updateField('content', $event)"
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
      <v-select
        :model-value="form.parent_id"
        @update:model-value="updateField('parent_id', $event)"
        :items="availableNodes"
        item-title="content"
        item-value="id"
        label="父观点"
        placeholder="请选择父观点"
        variant="outlined"
        required
        :error-messages="formErrors.parent_id"
        class="mb-4"
      />
      <v-autocomplete
        :model-value="form.son_ids"
        @update:model-value="updateField('son_ids', $event)"
        :items="availableNodes"
        item-title="content"
        item-value="id"
        label="子观点"
        placeholder="请选择子观点"
        variant="outlined"
        multiple
        chips
        closable-chips
        :error-messages="formErrors.son_ids"
        class="mb-4"
      />
      
      <h5 class="text-subtitle-1 mb-3">连接类型</h5>
      <v-radio-group :model-value="form.link_type" @update:model-value="updateField('link_type', $event)" inline>
        <v-radio label="支持 - 子观点支持父观点" value="supports" />
        <v-radio label="反驳 - 子观点反驳父观点" value="opposes" />
      </v-radio-group>
    </div>

    <!-- 正证分数（仅或观点） -->
    <div v-if="form.logic_type === 'or'" class="mb-6">
      <v-text-field
        :model-value="form.positive_score"
        @update:model-value="updateField('positive_score', Number($event))"
        label="正证分数 (0-1)"
        type="number"
        min="0"
        max="1"
        step="0.01"
        placeholder="可选，如0.7"
        variant="outlined"
      />
      <v-checkbox 
        :model-value="form.is_llm_score" 
        @update:model-value="updateField('is_llm_score', $event)"
        label="使用AI自动评分" 
      />
    </div>

    <!-- 创建者 -->
    <div class="mb-6">
      <v-text-field
        :model-value="form.creator"
        @update:model-value="updateField('creator', $event)"
        label="创建者"
        placeholder="请输入创建者名称..."
        variant="outlined"
        required
        :error-messages="formErrors.creator"
      />
    </div>
  </v-form>
</template>

<script setup lang="ts">
import type { Node, OpinionFormData } from '@/types';

interface Props {
  form: OpinionFormData;
  formErrors: Record<string, string[]>;
  availableNodes: Node[];
}

defineProps<Props>();

const emit = defineEmits<{
  update: [updates: Partial<OpinionFormData>];
}>();

const updateField = (field: keyof OpinionFormData, value: unknown) => {
  emit('update', { [field]: value });
};

const handleSubmit = () => {
  // 表单提交由父组件处理
};
</script>
