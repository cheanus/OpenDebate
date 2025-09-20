<template>
  <div class="context-menu">
    <v-list density="compact" nav>
      <!-- 节点右键菜单 -->
      <template v-if="type === 'node'">
        <v-list-item v-if="roleLevel == ROLELEVEL.guest" disabled>
          <template v-slot:prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          <v-list-item-title>权限不足</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.admin" @click="handleAction('editOpinion')">
          <template v-slot:prepend>
            <v-icon>mdi-pencil</v-icon>
          </template>
          <v-list-item-title>编辑观点</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.admin" @click="handleAction('deleteOpinion')">
          <template v-slot:prepend>
            <v-icon>mdi-close</v-icon>
          </template>
          <v-list-item-title>删除观点</v-list-item-title>
        </v-list-item>

        <v-divider v-if="roleLevel >= ROLELEVEL.admin && roleLevel >= ROLELEVEL.user" />

        <v-list-item v-if="roleLevel >= ROLELEVEL.user" @click="handleAction('addOpinion')">
          <template v-slot:prepend>
            <v-icon>mdi-plus</v-icon>
          </template>
          <v-list-item-title>添加观点</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.user" @click="handleAction('addLink')">
          <template v-slot:prepend>
            <v-icon>mdi-arrow-left-right</v-icon>
          </template>
          <v-list-item-title>添加连接</v-list-item-title>
        </v-list-item>
      </template>

      <!-- 边右键菜单 -->
      <template v-if="type === 'edge'">
        <v-list-item v-if="roleLevel == ROLELEVEL.guest" disabled>
          <template v-slot:prepend>
            <v-icon>mdi-alert</v-icon>
          </template>
          <v-list-item-title>权限不足</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.admin" @click="handleAction('editLink')">
          <template v-slot:prepend>
            <v-icon>mdi-pencil</v-icon>
          </template>
          <v-list-item-title>编辑连接</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.admin" @click="handleAction('deleteLink')">
          <template v-slot:prepend>
            <v-icon>mdi-close</v-icon>
          </template>
          <v-list-item-title>删除连接</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.user" @click="handleAction('attackLink')">
          <template v-slot:prepend>
            <v-icon>mdi-help</v-icon>
          </template>
          <v-list-item-title>质疑连接</v-list-item-title>
        </v-list-item>
      </template>

      <!-- 空白区域右键菜单 -->
      <template v-if="type === 'canvas'">
        <v-list-item v-if="roleLevel >= ROLELEVEL.user" @click="handleAction('addOpinion')">
          <template v-slot:prepend>
            <v-icon>mdi-plus</v-icon>
          </template>
          <v-list-item-title>添加观点</v-list-item-title>
        </v-list-item>

        <v-list-item v-if="roleLevel >= ROLELEVEL.user" @click="handleAction('addLink')">
          <template v-slot:prepend>
            <v-icon>mdi-arrow-left-right</v-icon>
          </template>
          <v-list-item-title>添加连接</v-list-item-title>
        </v-list-item>

        <v-divider v-if="roleLevel >= ROLELEVEL.user" />

        <v-list-item @click="handleAction('refreshView')">
          <template v-slot:prepend>
            <v-icon>mdi-refresh</v-icon>
          </template>
          <v-list-item-title>刷新视图</v-list-item-title>
        </v-list-item>

        <v-list-item @click="handleAction('fitToScreen')">
          <template v-slot:prepend>
            <v-icon>mdi-fit-to-screen</v-icon>
          </template>
          <v-list-item-title>适配屏幕</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { useAuth, ROLELEVEL } from '@/composables/core/useAuth';

const { roleLevel } = useAuth();

interface Props {
  type: string;
}

defineProps<Props>();

const emit = defineEmits<{
  action: [action: string];
}>();

const handleAction = (action: string) => {
  emit('action', action);
};
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 160px;
  max-width: 200px;
  overflow: hidden;
}

:deep(.v-list) {
  background-color: transparent !important;
  padding: 4px 0;
}

:deep(.v-list-item) {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background-color 0.2s ease;
}

:deep(.v-list-item:hover) {
  background-color: rgb(var(--v-theme-primary), 0.1);
}

:deep(.v-list-item.v-list-item--disabled) {
  opacity: 0.6;
}

:deep(.v-icon) {
  font-size: 18px;
}

:deep(.v-list-item-title) {
  font-size: 14px;
  font-weight: 400;
}

:deep(.v-divider) {
  margin: 4px 8px;
  opacity: 0.3;
}
</style>
