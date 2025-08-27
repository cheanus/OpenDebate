<template>
  <Teleport to="body">
    <div class="notifications-container">
      <UiNotification
        v-for="notification in notifications"
        :key="notification.id"
        :message="notification.message"
        :type="notification.type"
        :duration="0"
        @close="removeNotification(notification.id)"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { UiNotification } from './ui';
import { useNotifications } from '@/composables';

const { notifications, removeNotification } = useNotifications();
</script>

<style scoped>
/* 修复通知框被顶部应用栏遮挡的问题 */
.notifications-container {
  position: fixed;
  top: calc(64px + 1rem); /* Vuetify app-bar默认高度64px + 1rem间距 */
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.notifications-container :deep(.ui-notification) {
  pointer-events: auto;
}

@media (max-width: 768px) {
  .notifications-container {
    top: calc(56px + 1rem); /* 移动端app-bar高度通常是56px */
    left: 1rem;
    right: 1rem;
  }
}
</style>
