<template>
  <v-dialog
    v-model="internalShow"
    :persistent="persistent"
    :fullscreen="size === 'full'"
    :width="dialogWidth"
  >
    <v-card>
      <v-card-title v-if="title">
        {{ title }}
        <v-btn icon @click="handleClose" v-if="showClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <slot></slot>
      </v-card-text>

      <v-card-actions v-if="$slots.footer">
        <slot name="footer"></slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

export type ModalSize = 'small' | 'medium' | 'large' | 'full';

interface Props {
  show: boolean;
  title?: string;
  size?: ModalSize;
  showClose?: boolean;
  persistent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showClose: true,
  persistent: false,
});

const emit = defineEmits(['update:show']);
const internalShow = ref(props.show);

watch(
  () => props.show,
  (newVal) => {
    internalShow.value = newVal;
  },
);

watch(
  () => internalShow.value,
  (newVal) => {
    emit('update:show', newVal);
  },
);

const dialogWidth = computed(() => {
  switch (props.size) {
    case 'small':
      return '400px';
    case 'large':
      return '800px';
    default:
      return '600px';
  }
});

const handleClose = () => {
  internalShow.value = false;
};
</script>

<style scoped></style>
