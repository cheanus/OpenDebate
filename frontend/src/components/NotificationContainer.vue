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
.notifications-container {
  position: fixed;
  top: 1rem;
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
    left: 1rem;
    right: 1rem;
  }
}
</style>
