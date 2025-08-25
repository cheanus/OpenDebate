<template>
  <v-container fluid class="opinion-page pa-0">
    <!-- 页面标题 -->
    <v-card class="ma-4" elevation="1">
      <v-card-text class="pa-4">
        <div class="d-flex align-center mb-2">
          <v-icon color="primary" class="mr-3" size="large">mdi-sitemap</v-icon>
          <h2 class="text-h4">辩论观点图</h2>
        </div>
        <p class="text-subtitle-1 text-medium-emphasis mb-0">
          双击节点展开更多子观点，右键进行操作
        </p>
      </v-card-text>
    </v-card>

    <!-- 图形组件 -->
    <div class="graph-container ma-4">
      <OpinionGraph
        :elements="elements"
        :layout="graphLayout"
        @nodeDblClick="handleNodeDblClick"
        @nodeSelected="handleNodeSelected"
        @edgeSelected="handleEdgeSelected"
        @contextMenuAction="handleContextMenuAction"
        ref="opinionGraphRef"
      />
    </div>

    <!-- 操作提示 -->
    <v-card class="ma-4" elevation="1">
      <v-card-title class="text-h6">
        <v-icon left>mdi-help-circle</v-icon>
        操作提示
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="d-flex align-center mb-2">
              <v-icon color="primary" size="small" class="mr-2">mdi-mouse-double-click</v-icon>
              <strong>双击节点：</strong>
            </div>
            <p class="text-body-2 ml-6">展开更多子观点</p>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="d-flex align-center mb-2">
              <v-icon color="secondary" size="small" class="mr-2">mdi-mouse-right-click</v-icon>
              <strong>右键节点：</strong>
            </div>
            <p class="text-body-2 ml-6">编辑、删除观点或添加连接</p>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="d-flex align-center mb-2">
              <v-icon color="info" size="small" class="mr-2">mdi-vector-line</v-icon>
              <strong>右键连接：</strong>
            </div>
            <p class="text-body-2 ml-6">编辑、删除连接</p>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="d-flex align-center mb-2">
              <v-icon color="accent" size="small" class="mr-2">mdi-gesture-tap</v-icon>
              <strong>右键空白：</strong>
            </div>
            <p class="text-body-2 ml-6">添加观点、连接或刷新视图</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

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
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import OpinionGraph from '../components/OpinionGraph.vue';
import OpinionEditor from '../components/OpinionEditor.vue';
import LinkEditor from '../components/LinkEditor.vue';
import { useOpinionGraph } from '@/composables';
import { useNotifications } from '@/composables';
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
  setSelectedNode,
  setSelectedEdge,
  numClickUpdatedSon,
  loadDepth,
} = useOpinionGraph(debateId);

// 通知系统
const { notifySuccess, notifyError } = useNotifications();

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

  const confirmed = confirm(`确定要删除观点"${selectedNode.value.content.slice(0, 30)}..."吗？`);
  if (!confirmed) return;

  const success = await deleteOpinion(selectedNode.value.id);
  if (success) {
    setSelectedNode(null);
    notifySuccess('观点删除成功');
  } else {
    // 错误会通过 error 状态和 watch 处理，这里不需要额外处理
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
    notifySuccess('连接删除成功');
  } else {
    // 错误会通过 error 状态和 watch 处理，这里不需要额外处理
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
    notifySuccess(isEditingOpinion.value ? '观点更新成功' : '观点创建成功');
  } else {
    // 错误会通过 error 状态和 watch 处理，这里不需要额外处理
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
    notifySuccess(isEditingLink.value ? '连接更新成功' : '连接创建成功');
  } else {
    // 错误会通过 error 状态和 watch 处理，这里不需要额外处理
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

// 监听错误变化，显示错误通知
watch(
  error,
  (newError) => {
    if (newError) {
      notifyError(newError);
    }
  },
  { immediate: false },
);
</script>

<style scoped>
.opinion-page {
  height: 100vh;
  overflow: hidden;
}

.graph-container {
  height: calc(100vh - 320px);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 960px) {
  .graph-container {
    height: calc(100vh - 400px);
  }
}
</style>
