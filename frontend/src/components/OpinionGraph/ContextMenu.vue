<template>
  <div class="context-menu">
    <!-- 节点右键菜单 -->
    <div v-if="type === 'node'">
      <div class="context-menu-item" @click="handleAction('editOpinion')">
        <span class="menu-icon">✎</span>
        编辑观点
      </div>
      <div class="context-menu-item" @click="handleAction('deleteOpinion')">
        <span class="menu-icon">×</span>
        删除观点
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleAction('addOpinion')">
        <span class="menu-icon">+</span>
        添加观点
      </div>
      <div class="context-menu-item" @click="handleAction('addLink')">
        <span class="menu-icon">↔</span>
        添加连接
      </div>
    </div>

    <!-- 边右键菜单 -->
    <div v-if="type === 'edge'">
      <div class="context-menu-item" @click="handleAction('editLink')">
        <span class="menu-icon">✎</span>
        编辑连接
      </div>
      <div class="context-menu-item" @click="handleAction('deleteLink')">
        <span class="menu-icon">×</span>
        删除连接
      </div>
      <div class="context-menu-item" @click="handleAction('attackLink')">
        <span class="menu-icon">？</span>
        质疑连接
      </div>
    </div>

    <!-- 空白区域右键菜单 -->
    <div v-if="type === 'canvas'">
      <div class="context-menu-item" @click="handleAction('addOpinion')">
        <span class="menu-icon">+</span>
        添加观点
      </div>
      <div class="context-menu-item" @click="handleAction('addLink')">
        <span class="menu-icon">↔</span>
        添加连接
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" @click="handleAction('refreshView')">
        <span class="menu-icon">⟲</span>
        刷新视图
      </div>
      <div class="context-menu-item" @click="handleAction('fitToScreen')">
        <span class="menu-icon">⤢</span>
        适配屏幕
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  box-shadow: 0 8px 20px rgb(var(--v-theme-shadow));
  z-index: 1000;
  min-width: 150px;
  padding: 6px 0;
  color: rgb(var(--v-theme-on-surface));
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  transition:
    background-color 0.15s,
    color 0.15s;
}

.context-menu-item:hover {
  background-color: rgb(var(--v-theme-surface-bright));
  color: rgb(var(--v-theme-on-surface));
}

.context-menu-item:active {
  background-color: rgb(var(--v-theme-surface-container-high));
}

.menu-icon {
  margin-right: 8px;
  width: 16px;
  text-align: center;
  font-weight: bold;
  color: rgb(var(--v-theme-primary));
}

.context-menu-divider {
  height: 1px;
  background-color: rgb(var(--v-theme-outline));
  margin: 6px 0;
}
</style>
