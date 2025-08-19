<template>
  <div class="debate-toolbar">
    <div class="toolbar-section">
      <h3>观点操作</h3>
      <div class="button-group">
        <button @click="$emit('addOpinion')" class="btn btn-primary">
          <span class="icon">+</span>
          添加观点
        </button>
        <button 
          @click="$emit('editOpinion')" 
          :disabled="!selectedNode"
          class="btn btn-secondary"
        >
          <span class="icon">✎</span>
          编辑观点
        </button>
        <button 
          @click="$emit('deleteOpinion')" 
          :disabled="!selectedNode"
          class="btn btn-danger"
        >
          <span class="icon">×</span>
          删除观点
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <h3>连接操作</h3>
      <div class="button-group">
        <button @click="$emit('addLink')" class="btn btn-primary">
          <span class="icon">↔</span>
          添加连接
        </button>
        <button 
          @click="$emit('editLink')" 
          :disabled="!selectedEdge"
          class="btn btn-secondary"
        >
          <span class="icon">✎</span>
          编辑连接
        </button>
        <button 
          @click="$emit('deleteLink')" 
          :disabled="!selectedEdge"
          class="btn btn-danger"
        >
          <span class="icon">×</span>
          删除连接
        </button>
      </div>
    </div>

    <div class="toolbar-section">
      <h3>视图操作</h3>
      <div class="button-group">
        <button @click="$emit('refreshView')" class="btn btn-info">
          <span class="icon">⟲</span>
          刷新视图
        </button>
        <button @click="$emit('fitToScreen')" class="btn btn-info">
          <span class="icon">⤢</span>
          适配屏幕
        </button>
      </div>
    </div>

    <div class="toolbar-section" v-if="selectedNode || selectedEdge">
      <h3>选中信息</h3>
      <div class="selection-info">
        <div v-if="selectedNode">
          <strong>已选中观点:</strong>
          <p>{{ selectedNode.content?.slice(0, 60) }}{{ selectedNode.content?.length > 60 ? '...' : '' }}</p>
          <small>类型: {{ selectedNode.logic_type === 'and' ? '与观点' : '或观点' }}</small>
        </div>
        <div v-if="selectedEdge">
          <strong>已选中连接:</strong>
          <p>类型: {{ selectedEdge.link_type === 'supports' ? '支持' : '反驳' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedNode: Object,
  selectedEdge: Object
})

defineEmits([
  'addOpinion',
  'editOpinion', 
  'deleteOpinion',
  'addLink',
  'editLink',
  'deleteLink',
  'refreshView',
  'fitToScreen'
])
</script>

<style scoped>
.debate-toolbar {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.toolbar-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e7ef;
}

.toolbar-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.toolbar-section h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn .icon {
  font-size: 14px;
  font-weight: bold;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
  transform: translateY(-1px);
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-1px);
}

.btn-info {
  background: #1abc9c;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #16a085;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #bdc3c7;
  color: #7f8c8d;
  cursor: not-allowed;
  transform: none;
}

.selection-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
}

.selection-info strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 6px;
}

.selection-info p {
  margin: 0 0 4px 0;
  line-height: 1.4;
  color: #495057;
}

.selection-info small {
  color: #6c757d;
  font-style: italic;
}
</style>
