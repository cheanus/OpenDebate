<template>
  <v-dialog v-model="isVisible" max-width="800px" persistent>
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
            <v-select
              v-model="form.parent_id"
              :items="availableNodes"
              item-title="content"
              item-value="id"
              label="父观点"
              placeholder="请选择父观点"
              variant="outlined"
              required
              :error-messages="formErrors.parent_id"
              class="mb-4"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.content?.slice(0, 50) + '...'" />
              </template>
            </v-select>
            <v-autocomplete
              v-model="form.son_ids"
              :items="availableSonNodes"
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
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props" :title="item.raw.content?.slice(0, 40) + '...'" />
              </template>
            </v-autocomplete>

            <h5 class="text-subtitle-1 mb-3">连接类型</h5>
            <v-radio-group v-model="form.link_type" inline>
              <v-radio label="支持 - 子观点支持父观点" value="supports" />
              <v-radio label="反驳 - 子观点反驳父观点" value="opposes" />
            </v-radio-group>
          </div>

          <!-- 正证分数（仅或观点） -->
          <div v-if="form.logic_type === 'or'" class="mb-6">
            <v-text-field
              v-model.number="positiveScoreString"
              label="正证分数 (0-1)"
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="可选，如0.7"
              variant="outlined"
            />
          </div>

          <!-- AI评分选项（仅或观点） -->
          <div v-if="form.logic_type === 'or'" class="mb-6">
            <v-checkbox v-model="form.is_llm_score" label="使用AI自动评分" />
          </div>

          <!-- 创建者 -->
          <div class="mb-6">
            <v-text-field
              v-model="form.creator"
              label="创建者"
              placeholder="请输入创建者名称"
              variant="outlined"
              required
              :error-messages="formErrors.creator"
            />
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-6">
        <v-spacer />
        <v-btn variant="text" @click="handleClose"> 取消 </v-btn>
        <v-btn color="primary" variant="elevated" @click="handleSubmit" :loading="isSubmitting">
          {{ isEdit ? '更新' : '创建' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
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

// 计算可用的子节点（排除已选择的父节点，并过滤出 node_type 为 'solid' 的节点）
const availableSonNodes = computed(() => {
  return props.availableNodes.filter((node) => node.id !== form.value.parent_id && node.node_type === 'solid');
});

// 处理 positive_score 的类型转换
const positiveScoreString = computed({
  get: () => form.value.positive_score?.toString() || '',
  set: (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    form.value.positive_score = isNaN(numValue) ? null : numValue;
  },
});

// 清除表单错误
const clearFormErrors = () => {
  formErrors.value = {
    content: '',
    parent_id: '',
    son_ids: '',
    creator: '',
  };
};

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
          score: { positive: form.value.positive_score },
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
/* 已使用 Vuetify 组件，不需要自定义样式 */
</style>
