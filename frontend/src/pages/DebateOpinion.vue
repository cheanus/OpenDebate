<template>
  <v-container fluid class="opinion-page pa-0">
    <!-- 页面标题和搜索栏 -->
    <v-card class="ma-4" elevation="1">
      <v-card-text class="pa-4">
        <div class="d-flex align-center mb-3">
          <v-icon color="primary" class="mr-3" size="large">mdi-sitemap</v-icon>
          <h2 class="text-h4">辩论观点图</h2>
        </div>
        
        <p class="text-subtitle-1 text-medium-emphasis mb-0">
          点击节点上下箭头加载相邻观点，右键进行操作
        </p>
      </v-card-text>
    </v-card>

    <!-- 右上角搜索栏 -->
    <div class="search-overlay">
      <v-card class="search-card" elevation="2">
        <v-card-text class="pa-2">
          <v-autocomplete
            v-model="selectedSearchOpinion"
            :items="searchOpinions"
            :search="searchQuery"
            @update:search="handleSearchInput"
            :loading="searchLoading"
            item-title="content"
            item-value="id"
            label="搜索观点"
            placeholder="输入关键词搜索观点..."
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
            no-data-text="未找到匹配的观点"
            @update:model-value="handleSearchSelection"
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

    <!-- 图形组件 -->
    <div class="graph-container ma-4">
      <OpinionGraph
        :elements="elements"
        :layout="graphLayout"
        @nodeArrowClick="handleNodeArrowClick"
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
              <v-icon color="primary" size="small" class="mr-2">mdi-arrow-up-down</v-icon>
              <strong>点击箭头：</strong>
            </div>
            <p class="text-body-2 ml-6">加载上级或下级观点</p>
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
              <v-icon color="accent" size="small" class="mr-2">mdi-magnify</v-icon>
              <strong>搜索观点：</strong>
            </div>
            <p class="text-body-2 ml-6">快速定位并加载相关观点</p>
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
import { ref, onMounted, computed, watch, nextTick } from 'vue';
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
  searchQuery,
  searchOpinions,
  searchLoading,
  loadInitialNodes,
  loadChildren,
  loadParents,
  focusOnOpinion,
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
const opinionGraphRef = ref<{ cy: () => Core; centerNode: (nodeId: string) => void } | null>(null);
const selectedSearchOpinion = ref<string | null>(null);

// 搜索相关
let searchTimer: number | null = null;

const handleSearchInput = async (searchValue: string | null) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  
  // 延迟搜索，避免频繁请求
  searchTimer = window.setTimeout(async () => {
    searchQuery.value = searchValue || '';
  }, 300);
};

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
const handleNodeArrowClick = async (nodeId: string, direction: 'children' | 'parents') => {
  try {
    if (direction === 'children') {
      await loadChildren(nodeId, numClickUpdatedSon.value, loadDepth.value);
    } else {
      await loadParents(nodeId, numClickUpdatedSon.value, loadDepth.value);
    }
  } catch (error) {
    const directionText = direction === 'children' ? '子观点' : '父观点';
    const errorMsg = error instanceof Error ? error.message : '未知错误';
    notifyError(`加载${directionText}失败: ${errorMsg}`);
    console.error(`加载${directionText}失败:`, error);
  }
};

const handleSearchSelection = async (opinionId: string | null) => {
  if (!opinionId) return;
  
  try {
    const focusedNodeId = await focusOnOpinion(opinionId);
    if (focusedNodeId && opinionGraphRef.value) {
      // 延迟一点时间等待DOM更新
      await nextTick();
      setTimeout(() => {
        opinionGraphRef.value?.centerNode(focusedNodeId);
      }, 100);
    }
  } catch (error) {
    console.error('搜索定位失败:', error);
  }
  
  // 清空搜索选择
  selectedSearchOpinion.value = null;
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

.search-container {
  max-width: 600px;
}

.search-overlay {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 1000;
  width: 350px;
}

.search-card {
  background: rgba(var(--v-theme-surface-bright), 0.95);
  backdrop-filter: blur(8px);
}

.search-field {
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}

.graph-container {
  height: calc(100vh - 380px);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 960px) {
  .graph-container {
    height: calc(100vh - 460px);
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .search-overlay {
    position: fixed;
    top: 10px;
    right: 10px;
    width: calc(100vw - 20px);
    max-width: 300px;
  }
}
</style>
