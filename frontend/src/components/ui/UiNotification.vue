<template>
  <Transition name="notification" appear>
    <div class="ui-notification" :class="notificationClasses">
      <div class="notification-content">
        <div class="notification-icon" v-if="showIcon">
          <span v-if="type === 'success'">✓</span>
          <span v-else-if="type === 'error'">✕</span>
          <span v-else-if="type === 'warning'">!</span>
          <span v-else>ⓘ</span>
        </div>
        <div class="notification-message">
          {{ message }}
        </div>
        <UiButton
          variant="ghost"
          size="small"
          @click="handleClose"
          class="notification-close"
          v-if="showClose"
        >
          ×
        </UiButton>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import UiButton from './UiButton.vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  message: string;
  type?: NotificationType;
  showIcon?: boolean;
  showClose?: boolean;
  duration?: number; // 自动关闭时间（毫秒），0 表示不自动关闭
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  showIcon: true,
  showClose: true,
  duration: 4000,
});

const emit = defineEmits<{
  close: [];
}>();

const notificationClasses = computed(() => [
  'ui-notification',
  `ui-notification--${props.type}`,
]);

const handleClose = () => {
  emit('close');
};

// 自动关闭
if (props.duration > 0) {
  setTimeout(() => {
    emit('close');
  }, props.duration);
}
</script>

<style scoped>
.ui-notification {
  position: fixed;
  top: 1rem;
  right: 1rem;
  min-width: 320px;
  max-width: 480px;
  z-index: 1000;
  border-radius: var(--border-radius-md);
  border: 1px solid;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.ui-notification--success {
  background: rgba(16, 185, 129, 0.1);
  border-color: var(--color-success);
  color: var(--color-success);
}

.ui-notification--error {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.ui-notification--warning {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.ui-notification--info {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.notification-content {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  gap: 0.75rem;
}

.notification-icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
}

.notification-message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.5;
}

.notification-close {
  flex-shrink: 0;
  opacity: 0.7;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.25rem;
  min-width: auto;
  width: 1.5rem;
  height: 1.5rem;
}

.notification-close:hover {
  opacity: 1;
}

/* 过渡动画 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .ui-notification {
    left: 1rem;
    right: 1rem;
    min-width: auto;
    max-width: none;
  }
  
  .notification-enter-from,
  .notification-leave-to {
    transform: translateY(-100%);
  }
}
</style>
