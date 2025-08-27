<template>
  <div class="search-overlay">
    <v-card class="search-card" elevation="2">
      <v-card-text class="pa-2">
        <v-autocomplete
          :model-value="selected"
          :items="searchOpinions"
          :search="searchQuery"
          @update:search="handleSearchUpdate"
          :loading="searchLoading"
          item-title="content"
          item-value="id"
          label="搜索观点"
          placeholder="输入关键词搜索观点..."
          prepend-inner-icon="mdi-magnify"
          clearable
          hide-details
          no-data-text="未找到匹配的观点"
          @update:model-value="handleSelectionUpdate"
          class="search-field"
          density="compact"
          variant="outlined"
          bg-color="surface-bright"
        >
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :title="item.raw.content.length > 50 ? item.raw.content.slice(0, 50) + '...' : item.raw.content"
              :subtitle="'ID: ' + item.raw.id"
            >
              <template #prepend>
                <v-icon 
                  :color="item.raw.logic_type === 'and' ? 'info' : 'secondary'" 
                  size="small"
                >
                  {{ item.raw.logic_type === 'and' ? 'mdi-set-all' : 'mdi-set-union' }}
                </v-icon>
              </template>
            </v-list-item>
          </template>
        </v-autocomplete>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { Node } from '@/types';

interface Props {
  selected: string | null;
  searchQuery: string;
  searchOpinions: Node[];
  searchLoading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  'update:search': [value: string | null];
  'selection-change': [value: string | null];
}>();

const handleSearchUpdate = (value: string | null) => {
  emit('update:search', value);
};

const handleSelectionUpdate = (value: string | null) => {
  emit('selection-change', value);
};
</script>

<style scoped>
.search-overlay {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  width: 350px;
}

.search-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.search-field {
  max-width: 100%;
}

@media (max-width: 768px) {
  .search-overlay {
    position: relative;
    top: 0;
    right: 0;
    width: 100%;
    margin: 0 16px;
  }
}
</style>
