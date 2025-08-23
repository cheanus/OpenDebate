<template>
  <div class="ui-button" :class="buttonClasses" @click="handleClick" :disabled="disabled || loading">
    <div v-if="loading" class="button-spinner"></div>
    <slot v-else></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false,
  block: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const buttonClasses = computed(() => [
  'ui-button',
  `ui-button--${props.variant}`,
  `ui-button--${props.size}`,
  {
    'ui-button--disabled': props.disabled || props.loading,
    'ui-button--loading': props.loading,
    'ui-button--block': props.block,
  },
]);

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event);
  }
};
</script>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius);
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  position: relative;
  min-width: 0;
}

.ui-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary), 0 0 0 4px rgba(37, 99, 235, 0.1);
}

/* Variants */
.ui-button--primary {
  background: var(--primary);
  color: white;
}

.ui-button--primary:hover:not(.ui-button--disabled) {
  background: var(--primary-hover);
}

.ui-button--secondary {
  background: var(--secondary);
  color: var(--text);
  border: 1px solid var(--border);
}

.ui-button--secondary:hover:not(.ui-button--disabled) {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.ui-button--danger {
  background: #ef4444;
  color: white;
}

.ui-button--danger:hover:not(.ui-button--disabled) {
  background: #dc2626;
}

.ui-button--ghost {
  background: transparent;
  color: var(--text-light);
  border: 1px solid transparent;
}

.ui-button--ghost:hover:not(.ui-button--disabled) {
  background: var(--secondary);
  color: var(--text);
}

/* Sizes */
.ui-button--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.ui-button--medium {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.ui-button--large {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}

/* States */
.ui-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-button--loading {
  cursor: wait;
}

.ui-button--block {
  width: 100%;
}

.button-spinner {
  width: 1em;
  height: 1em;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
