<template>
  <div class="ui-modal-overlay" @click="handleOverlayClick" v-show="show">
    <div 
      class="ui-modal-content" 
      :class="modalClasses" 
      @click.stop
      ref="modalRef"
    >
      <div class="ui-modal-header" v-if="$slots.header || title">
        <slot name="header">
          <h3 class="ui-modal-title">{{ title }}</h3>
        </slot>
        <button 
          v-if="showClose" 
          class="ui-modal-close" 
          @click="handleClose"
          aria-label="关闭"
        >
          ×
        </button>
      </div>
      
      <div class="ui-modal-body">
        <slot></slot>
      </div>
      
      <div class="ui-modal-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue';

export type ModalSize = 'small' | 'medium' | 'large' | 'full';

interface Props {
  show: boolean;
  title?: string;
  size?: ModalSize;
  showClose?: boolean;
  closeOnOverlay?: boolean;
  persistent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showClose: true,
  closeOnOverlay: true,
  persistent: false,
});

const emit = defineEmits<{
  'update:show': [value: boolean];
  close: [];
  open: [];
}>();

const modalRef = ref<HTMLElement>();

const modalClasses = computed(() => [
  'ui-modal-content',
  `ui-modal-content--${props.size}`,
]);

const handleClose = () => {
  if (!props.persistent) {
    emit('update:show', false);
    emit('close');
  }
};

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.persistent) {
    handleClose();
  }
};

// 监听显示状态变化
watch(() => props.show, (newShow) => {
  if (newShow) {
    emit('open');
    nextTick(() => {
      // 聚焦到模态框内容，提高可访问性
      modalRef.value?.focus();
    });
    
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
  } else {
    // 恢复背景滚动
    document.body.style.overflow = '';
  }
}, { immediate: true });

// 监听键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.show && !props.persistent) {
    handleClose();
  }
};

// 添加键盘监听器
document.addEventListener('keydown', handleKeydown);

// 组件卸载时清理
import { onBeforeUnmount } from 'vue';
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.ui-modal-overlay {
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
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

.ui-modal-content {
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: 0 20px 60px -8px rgba(0, 0, 0, 0.4);
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
  outline: none;
}

.ui-modal-content--small {
  width: 90%;
  max-width: 400px;
}

.ui-modal-content--medium {
  width: 90%;
  max-width: 600px;
}

.ui-modal-content--large {
  width: 90%;
  max-width: 800px;
}

.ui-modal-content--full {
  width: 95%;
  max-width: 1200px;
  height: 90vh;
}

.ui-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.ui-modal-title {
  margin: 0;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 600;
}

.ui-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-light);
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.ui-modal-close:hover {
  background: var(--secondary);
  color: var(--text);
}

.ui-modal-body {
  padding: 1.5rem;
}

.ui-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .ui-modal-content {
    margin: 1rem;
    width: calc(100% - 2rem) !important;
    max-width: none !important;
  }
  
  .ui-modal-content--full {
    height: calc(100vh - 2rem);
  }
  
  .ui-modal-header,
  .ui-modal-body,
  .ui-modal-footer {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
