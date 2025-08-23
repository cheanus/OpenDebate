<template>
  <div class="opinion-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>辩论观点图</h2>
      <p>双击节点展开更多子观点，右键进行操作</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
      <UiButton variant="ghost" size="small" @click="clearError">×</UiButton>
    </div>

    <!-- 图形组件 -->
    <OpinionGraph
      :elements="elements"
      :layout="graphLayout"
      @nodeDblClick="handleNodeDblClick"
      @nodeSelected="handleNodeSelected"
      @edgeSelected="handleEdgeSelected"
      @contextMenuAction="handleContextMenuAction"
      ref="opinionGraphRef"
    />

    <!-- 操作提示 -->
    <div class="operation-hints">
      <div class="hint-item"><strong>双击节点：</strong>展开更多子观点</div>
      <div class="hint-item"><strong>右键节点：</strong>编辑、删除观点或添加连接</div>
      <div class="hint-item"><strong>右键连接：</strong>编辑、删除连接</div>
      <div class="hint-item"><strong>右键空白：</strong>添加观点、连接或刷新视图</div>
    </div>

    <!-- 观点编辑器 -->
    <OpinionEditor
      v-if="showOpinionEditor"
      :isEdit="isEditingOpinion"
      :opinion="selectedNode"
      :debateId="debateId"
      :availableNodes="availableNodes"
      @submit="handleOpinionSubmit"
      @close="closeOpinionEditor"
    />

    <!-- 连接编辑器 -->
    <LinkEditor
      v-if="showLinkEditor"
      :isEdit="isEditingLink"
      :link="selectedEdge"
      :availableNodes="availableNodes"
      @submit="handleLinkSubmit"
      @close="closeLinkEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { UiButton } from '@/components/ui';
import OpinionGraph from '../components/OpinionGraph.vue';
import OpinionEditor from '../components/OpinionEditor.vue';
import LinkEditor from '../components/LinkEditor.vue';
import { useOpinionGraph } from '@/composables';
import type { Node, Edge, OpinionFormData, LinkFormData } from '@/types';
import type { Core } from 'cytoscape';

const route = useRoute();
const debateId = route.params.id as string;

// 使用组合函数
const {
  elements,
  availableNodes,
  error,
  selectedNode,
  selectedEdge,
  loadInitialNodes,
  loadChildren,
  refreshView,
  createOpinion,
  updateOpinion,
  deleteOpinion,
  createLink,
  updateLink,
  deleteLink,
  clearError,
  setSelectedNode,
  setSelectedEdge,
  numClickUpdatedSon,
  loadDepth,
} = useOpinionGraph(debateId);

// 本地状态
const showOpinionEditor = ref(false);
const showLinkEditor = ref(false);
const isEditingOpinion = ref(false);
const isEditingLink = ref(false);
const opinionGraphRef = ref<{ cy: () => Core } | null>(null);

// 图形布局配置
const graphLayout = computed(() => ({
  name: 'dagre',
  rankDir: 'BT',
  nodeSep: 50,
  edgeSep: 10,
  rankSep: 80,
  fit: false, // 不自动适配所有节点
  padding: 50,
}));

// 事件处理
const handleNodeDblClick = async (nodeData: Node) => {
  if (!nodeData.has_more_children) return;
  await loadChildren(nodeData.id, numClickUpdatedSon.value, loadDepth.value);
};

const handleNodeSelected = (nodeData: Node | null) => {
  setSelectedNode(nodeData);
  setSelectedEdge(null);
};

const handleEdgeSelected = (edgeData: Edge | null) => {
  setSelectedEdge(edgeData);
  setSelectedNode(null);
};

const handleContextMenuAction = (action: string) => {
  switch (action) {
    case 'addOpinion':
      showOpinionEditorDialog();
      break;
    case 'editOpinion':
      editSelectedOpinion();
      break;
    case 'deleteOpinion':
      deleteSelectedOpinion();
      break;
    case 'addLink':
      showLinkEditorDialog();
      break;
    case 'editLink':
      editSelectedLink();
      break;
    case 'deleteLink':
      deleteSelectedLink();
      break;
    case 'refreshView':
      refreshView();
      break;
    case 'fitToScreen':
      fitToScreen();
      break;
    default:
      console.warn('未知的菜单操作:', action);
  }
};

// 编辑器操作
const showOpinionEditorDialog = () => {
  isEditingOpinion.value = false;
  showOpinionEditor.value = true;
};

const editSelectedOpinion = () => {
  if (!selectedNode.value) return;
  isEditingOpinion.value = true;
  showOpinionEditor.value = true;
};

const deleteSelectedOpinion = async () => {
  if (!selectedNode.value) return;

  const confirmed = confirm(
    `确定要删除观点"${selectedNode.value.content.slice(0, 30)}..."吗？`,
  );
  if (!confirmed) return;

  const success = await deleteOpinion(selectedNode.value.id);
  if (success) {
    setSelectedNode(null);
    alert('观点删除成功');
  }
};

const showLinkEditorDialog = () => {
  isEditingLink.value = false;
  showLinkEditor.value = true;
};

const editSelectedLink = () => {
  if (!selectedEdge.value) return;
  isEditingLink.value = true;
  showLinkEditor.value = true;
};

const deleteSelectedLink = async () => {
  if (!selectedEdge.value) return;

  const confirmed = confirm('确定要删除这个连接吗？');
  if (!confirmed) return;

  const success = await deleteLink(selectedEdge.value.id);
  if (success) {
    setSelectedEdge(null);
    alert('连接删除成功');
  }
};

// 处理提交
const handleOpinionSubmit = async (formData: OpinionFormData) => {
  let success = false;

  if (isEditingOpinion.value && selectedNode.value) {
    success = await updateOpinion({
      id: selectedNode.value.id,
      content: formData.content,
      creator: formData.creator,
      score: formData.score,
      is_llm_score: formData.is_llm_score,
    });
  } else {
    const result = await createOpinion({
      logic_type: formData.logic_type,
      content: formData.content,
      parent_id: formData.parent_id,
      son_ids: formData.son_ids,
      link_type: formData.link_type,
      positive_score: formData.positive_score,
      is_llm_score: formData.is_llm_score,
      creator: formData.creator,
    });
    success = !!result;
  }

  if (success) {
    closeOpinionEditor();
    alert(isEditingOpinion.value ? '观点更新成功' : '观点创建成功');
  }
};

const handleLinkSubmit = async (formData: LinkFormData) => {
  let success = false;

  if (isEditingLink.value && formData.id) {
    success = await updateLink({
      id: formData.id,
      link_type: formData.link_type,
    });
  } else {
    const result = await createLink({
      from_id: formData.from_id,
      to_id: formData.to_id,
      link_type: formData.link_type,
    });
    success = !!result;
  }

  if (success) {
    closeLinkEditor();
    alert(isEditingLink.value ? '连接更新成功' : '连接创建成功');
  }
};

// 关闭编辑器
const closeOpinionEditor = () => {
  showOpinionEditor.value = false;
  isEditingOpinion.value = false;
};

const closeLinkEditor = () => {
  showLinkEditor.value = false;
  isEditingLink.value = false;
};

// 适配屏幕
const fitToScreen = () => {
  const cyInstance = opinionGraphRef.value?.cy();
  if (cyInstance) {
    cyInstance.fit();
  }
};

// 初始化
onMounted(() => {
  loadInitialNodes();
});
</script>

<style scoped>
.opinion-page {
  width: 70%;
  margin: 0 auto;
  padding: 2rem;
  background: var(--color-gray-900);
  color: var(--color-text-primary);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  /* min-height: 80vh; */
}

.page-header {
  text-align: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-gray-700);
}

.page-header h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.error-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid var(--color-danger);
  border-radius: var(--border-radius-md);
  color: var(--color-danger);
}

.operation-hints {
  background: var(--color-gray-800);
  border: 1px solid var(--color-gray-700);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.hint-item {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.hint-item strong {
  color: var(--color-text-primary);
  margin-right: 0.5rem;
  min-width: 80px;
}

@media (max-width: 768px) {
  .opinion-page {
    margin: 1rem;
    padding: 1rem;
  }
  
  .operation-hints {
    grid-template-columns: 1fr;
  }

  .hint-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .hint-item strong {
    min-width: auto;
    margin-right: 0;
  }
}
</style>
