<template>
  <!-- 主对话框 -->
  <v-dialog v-model="shouldShowDialog" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">
        <v-icon left>{{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
        {{ isEdit ? '编辑连接' : '创建连接' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form @submit.prevent="handleSubmit">
          <!-- 起始节点 -->
          <v-autocomplete
            v-model="form.from_id"
            :items="availableFromNodesForSelect"
            item-title="title"
            item-value="value"
            label="起始观点"
            placeholder="搜索或选择起始观点"
            variant="outlined"
            required
            :error-messages="formErrors.from_id"
            class="mb-4"
            clearable
          >
            <template v-slot:append-inner>
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-cursor-pointer"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="startNodeSelection('from')"
                    :disabled="isEdit"
                  />
                </template>
                <span>从图上选择节点</span>
              </v-tooltip>
            </template>
          </v-autocomplete>

          <!-- 目标节点 -->
          <v-autocomplete
            v-model="form.to_id"
            :items="availableToNodesForSelect"
            item-title="title"
            item-value="value"
            label="目标观点"
            placeholder="搜索或选择目标观点"
            variant="outlined"
            required
            :error-messages="formErrors.to_id"
            class="mb-4"
            clearable
            :disabled="!form.from_id"
          >
            <template v-slot:append-inner>
              <v-tooltip bottom>
                <template v-slot:activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-cursor-pointer"
                    size="small"
                    variant="text"
                    color="primary"
                    @click="startNodeSelection('to')"
                    :disabled="isEdit || !form.from_id"
                  />
                </template>
                <span>从图上选择节点</span>
              </v-tooltip>
            </template>
          </v-autocomplete>

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

  <!-- 节点选择模式提示 - 固定在右上角 -->
  <v-card
    v-if="isDialogHidden && isInSelectionMode"
    class="selection-hint"
    elevation="8"
    color="primary"
  >
    <v-card-text class="pa-4 text-white">
      <v-icon icon="mdi-information" class="mr-2" />
      {{ selectionModeText }}
      <v-btn
        icon="mdi-close"
        size="small"
        variant="text"
        color="white"
        class="ml-2"
        @click="exitSelectionMode"
      />
    </v-card-text>
  </v-card>
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
  submit: [data: LinkFormData, callback: () => void];
  startNodeSelection: [mode: 'from' | 'to'];
  exitNodeSelection: [];
}>();

// 显示控制
const isVisible = ref(true);
const isDialogHidden = ref(false); // 控制对话框临时隐藏

// 计算对话框是否应该显示
const shouldShowDialog = computed(() => {
  return isVisible.value && !isDialogHidden.value;
});

// 节点选择模式状态
const isInSelectionMode = ref(false);
const selectionMode = ref<'from' | 'to' | null>(null);

// 监听显示状态变化，处理点击外部关闭
watch(shouldShowDialog, (newValue) => {
  if (!newValue && !isDialogHidden.value) {
    // 只有在对话框不是被临时隐藏时才触发关闭事件
    emit('close');
  }
});

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

// 计算可用的起始节点（node_type = solid）
const availabeFromNodes = computed(() => {
  return availableToNodes.value.filter((node) => node.id !== form.value.to_id);
});

// 计算可用的目标节点（排除已选择的起始节点）
const availableToNodes = computed(() => {
  return props.availableNodes.filter((node) => node.node_type === 'solid');
});

// 为 v-autocomplete 转换起始节点数据格式
const availableFromNodesForSelect = computed(() => {
  return availabeFromNodes.value.map((node) => ({
    title: node.content,
    value: node.id,
  }));
});

// 为 v-autocomplete 转换目标节点数据格式
const availableToNodesForSelect = computed(() => {
  return availableToNodes.value.map((node) => ({
    title: node.content,
    value: node.id,
  }));
});

// 节点选择模式提示文本
const selectionModeText = computed(() => {
  if (selectionMode.value === 'from') {
    return '请在观点图上点击一个节点作为起始观点';
  } else if (selectionMode.value === 'to') {
    return '请在观点图上点击一个节点作为目标观点';
  }
  return '';
});

// 开始节点选择模式
const startNodeSelection = (mode: 'from' | 'to') => {
  isInSelectionMode.value = true;
  selectionMode.value = mode;
  isDialogHidden.value = true; // 隐藏对话框
  emit('startNodeSelection', mode);
};

// 退出节点选择模式
const exitSelectionMode = () => {
  isInSelectionMode.value = false;
  selectionMode.value = null;
  isDialogHidden.value = false; // 重新显示对话框
  emit('exitNodeSelection');
};

// 处理从外部传入的节点选择
const handleNodeSelected = (nodeId: string) => {
  if (!isInSelectionMode.value || !selectionMode.value) return;

  if (selectionMode.value === 'from') {
    form.value.from_id = nodeId;
  } else if (selectionMode.value === 'to') {
    form.value.to_id = nodeId;
  }

  // 延迟退出选择模式，给用户一点时间看到选择结果
  setTimeout(() => {
    exitSelectionMode();
  }, 200);
};

// 暴露给父组件的方法
defineExpose({
  handleNodeSelected,
});

// 清除表单错误
const clearFormErrors = () => {
  formErrors.value = {
    from_id: '',
    to_id: '',
  };
};

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
    // 重置选择模式
    exitSelectionMode();
  },
  { immediate: true },
);

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

  const submitData = { ...form.value };
  if (props.isEdit && props.link) {
    submitData.id = props.link.id;
  }

  emit('submit', submitData, () => {
    isSubmitting.value = false;
  });
};

// 处理关闭
const handleClose = () => {
  exitSelectionMode();
  isVisible.value = false;
  emit('close');
};
</script>

<style scoped>
.selection-hint {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 2000;
  max-width: 350px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .selection-hint {
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>
