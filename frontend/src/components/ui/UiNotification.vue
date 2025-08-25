<template>
  <v-alert
    :type="type"
    :icon="showIcon ? icon : undefined"
    :dismissible="showClose"
    @click:close="handleClose"
  >
    {{ message }}
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Props {
  message: string;
  type?: NotificationType;
  showIcon?: boolean;
  showClose?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  showIcon: true,
  showClose: true,
});

const emit = defineEmits(['close']);

const icon = computed(() => {
  switch (props.type) {
    case 'success':
      return 'mdi-check-circle';
    case 'error':
      return 'mdi-alert-circle';
    case 'warning':
      return 'mdi-alert';
    default:
      return 'mdi-information';
  }
});

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
/* 这里可以添加自定义样式 */
</style>
