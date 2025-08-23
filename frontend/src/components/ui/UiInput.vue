<template>
  <div class="ui-input-group">
    <label v-if="label" :for="inputId" class="ui-input-label">
      {{ label }}
      <span v-if="required" class="ui-input-required">*</span>
    </label>
    
    <div class="ui-input-wrapper" :class="inputWrapperClasses">
      <div v-if="$slots.prefix" class="ui-input-prefix">
        <slot name="prefix"></slot>
      </div>
      
      <component
        :is="tag"
        :id="inputId"
        :value="modelValue"
        :class="inputClasses"
        :disabled="disabled"
        :readonly="readonly"
        :placeholder="placeholder"
        :type="type"
        :rows="rows"
        :cols="cols"
        :min="min"
        :max="max"
        :step="step"
        v-bind="$attrs"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      />
      
      <div v-if="$slots.suffix" class="ui-input-suffix">
        <slot name="suffix"></slot>
      </div>
    </div>
    
    <div v-if="error || helperText" class="ui-input-help">
      <span v-if="error" class="ui-input-error">{{ error }}</span>
      <span v-else-if="helperText" class="ui-input-helper">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

export type InputSize = 'small' | 'medium' | 'large';

interface Props {
  modelValue: string | number;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  tag?: 'input' | 'textarea';
  size?: InputSize;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  rows?: number;
  cols?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  tag: 'input',
  size: 'medium',
  disabled: false,
  readonly: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  input: [event: Event];
  change: [event: Event];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const focused = ref(false);
const inputId = `ui-input-${Math.random().toString(36).substr(2, 9)}`;

const inputWrapperClasses = computed(() => [
  'ui-input-wrapper',
  `ui-input-wrapper--${props.size}`,
  {
    'ui-input-wrapper--focused': focused.value,
    'ui-input-wrapper--disabled': props.disabled,
    'ui-input-wrapper--error': !!props.error,
    'ui-input-wrapper--readonly': props.readonly,
  },
]);

const inputClasses = computed(() => [
  'ui-input',
  `ui-input--${props.size}`,
  {
    'ui-input--disabled': props.disabled,
    'ui-input--error': !!props.error,
  },
]);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  const value = props.type === 'number' ? Number(target.value) : target.value;
  emit('update:modelValue', value);
  emit('input', event);
};

const handleChange = (event: Event) => {
  emit('change', event);
};

const handleFocus = (event: FocusEvent) => {
  focused.value = true;
  emit('focus', event);
};

const handleBlur = (event: FocusEvent) => {
  focused.value = false;
  emit('blur', event);
};
</script>

<style scoped>
.ui-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ui-input-label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.875rem;
}

.ui-input-required {
  color: #ef4444;
  margin-left: 0.25rem;
}

.ui-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  background: var(--card-bg);
  transition: all 0.2s ease;
}

.ui-input-wrapper--focused {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.ui-input-wrapper--error {
  border-color: #ef4444;
}

.ui-input-wrapper--error.ui-input-wrapper--focused {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.ui-input-wrapper--disabled {
  background: var(--secondary);
  opacity: 0.6;
}

.ui-input-wrapper--readonly {
  background: var(--secondary);
}

.ui-input-wrapper--small {
  padding: 0.375rem;
}

.ui-input-wrapper--medium {
  padding: 0.5rem;
}

.ui-input-wrapper--large {
  padding: 0.75rem;
}

.ui-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: inherit;
  font-family: inherit;
  color: var(--text);
  min-width: 0;
}

.ui-input::placeholder {
  color: var(--text-light);
}

.ui-input--small {
  font-size: 0.875rem;
}

.ui-input--medium {
  font-size: 1rem;
}

.ui-input--large {
  font-size: 1.125rem;
}

.ui-input-prefix,
.ui-input-suffix {
  display: flex;
  align-items: center;
  color: var(--text-light);
  font-size: 0.875rem;
}

.ui-input-prefix {
  margin-right: 0.5rem;
}

.ui-input-suffix {
  margin-left: 0.5rem;
}

.ui-input-help {
  font-size: 0.75rem;
  line-height: 1.4;
}

.ui-input-error {
  color: #ef4444;
}

.ui-input-helper {
  color: var(--text-light);
}
</style>
