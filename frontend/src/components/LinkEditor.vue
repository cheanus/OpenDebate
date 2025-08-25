<template>
  <v-dialog v-model="isVisible" max-width="600px" persistent>
    <v-card>
      <v-card-title class="text-h5">
        <v-icon left>{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
        {{ isEdit ? '编辑连接' : '创建连接' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form @submit.prevent="handleSubmit">
          <!-- 起始节点 -->
          <v-select
            v-model="form.from_id"
            :items="availableNodes"
            item-title="content"
            item-value="id"
            label="起始观点"
            placeholder="请选择起始观点"
            variant="outlined"
            required
            :error-messages="formErrors.from_id"
            class="mb-4"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.content?.slice(0, 60) + '...'" />
            </template>
          </v-select>

          <!-- 目标节点 -->
          <v-select
            v-model="form.to_id"
            :items="availableToNodes"
            item-title="content"
            item-value="id"
            label="目标观点"
            placeholder="请选择目标观点"
            variant="outlined"
            required
            :error-messages="formErrors.to_id"
            class="mb-4"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="item.raw.content?.slice(0, 60) + '...'" />
            </template>
          </v-select>

          <!-- 连接类型 -->
          <div class="mb-6">
            <h5 class="text-subtitle-1 mb-3">连接类型</h5>
            <v-radio-group v-model="form.link_type">
              <v-radio value="supports">
                <template v-slot:label>
                  <div>
                    <div class="text-subtitle-2">支持</div>
                    <div class="text-caption text-medium-emphasis">起始观点支持目标观点</div>
                  </div>
                </template>
              </v-radio>
              <v-radio value="opposes">
                <template v-slot:label>
                  <div>
                    <div class="text-subtitle-2">反驳</div>
                    <div class="text-caption text-medium-emphasis">起始观点反驳目标观点</div>
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
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
import { ref, watch, computed } from 'vue';
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

// 计算可用的目标节点（排除已选择的起始节点）
const availableToNodes = computed(() => {
  return props.availableNodes.filter((node) => node.id !== form.value.from_id);
});

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
/* 已使用 Vuetify 组件，不需要自定义样式 */
</style>
