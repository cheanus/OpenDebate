<template>
  <v-text-field
    v-model="internalValue"
    :label="label"
    :placeholder="placeholder"
    :type="type"
    :error="!!error"
    :error-messages="error"
    :disabled="disabled"
    :readonly="readonly"
    :prefix="$slots.prefix ? '' : undefined"
    :suffix="$slots.suffix ? '' : undefined"
    v-bind="$attrs"
  >
    <template v-slot:prepend v-if="$slots.prefix">
      <slot name="prefix"></slot>
    </template>
    <template v-slot:append v-if="$slots.suffix">
      <slot name="suffix"></slot>
    </template>
  </v-text-field>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue: string | number;
  label?: string;
  placeholder?: string;
  type?: string;
  error?: string;
  disabled?: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  readonly: false,
});

const emit = defineEmits(['update:modelValue']);
const internalValue = ref(props.modelValue);

watch(
  () => props.modelValue,
  (newVal) => {
    internalValue.value = newVal;
  },
);

watch(
  () => internalValue.value,
  (newVal) => {
    emit('update:modelValue', newVal);
  },
);
</script>
