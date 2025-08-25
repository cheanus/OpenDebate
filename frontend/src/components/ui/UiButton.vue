<template>
  <v-btn
    :variant="variant"
    :size="size"
    :block="block"
    :loading="loading"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot></slot>
  </v-btn>
</template>

<script setup lang="ts">
export type ButtonVariant = 'elevated' | 'flat' | 'tonal' | 'outlined' | 'text' | 'plain';
export type ButtonSize = 'x-small' | 'small' | 'default' | 'large' | 'x-large';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'elevated',
  size: 'default',
  disabled: false,
  loading: false,
  block: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>
