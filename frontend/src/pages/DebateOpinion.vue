<template>
  <v-container fluid class="opinion-page pa-0">
    <!-- 页面标题和搜索栏 -->
    <PageHeader />

    <!-- 右上角搜索栏 -->
    <SearchOverlay
      v-model:selected="selectedSearchOpinion"
      :search-query="searchQuery"
      :search-opinions="searchOpinions"
      :search-loading="searchLoading"
      @update:search="handleSearchInput"
      @selection-change="handleSearchSelection"
    />

    <!-- 图形组件 -->
    <div class="graph-container ma-4">
      <OpinionGraph
        :elements="elements"
        :layout="graphLayout"
        @node-arrow-click="handleNodeArrowClick"
        @node-selected="handleNodeSelected"
        @edge-selected="handleEdgeSelected"
        @context-menu-action="handleContextMenuAction"
        ref="opinionGraphRef"
      />
    </div>

    <!-- 操作提示 -->
    <HelpSection />

    <!-- 观点编辑器 -->
    <OpinionEditor
      v-if="showOpinionEditor"
      :is-edit="isEditingOpinion"
      :opinion="selectedNode"
      :debate-id="debateId"
      :available-nodes="availableNodes"
      @submit="(data) => handleOpinionSubmit(data, isEditingOpinion)"
      @close="closeOpinionEditor"
    />

    <!-- 连接编辑器 -->
    <LinkEditor
      v-if="showLinkEditor"
      :is-edit="isEditingLink"
      :link="selectedEdge"
      :available-nodes="availableNodes"
      @submit="(data) => handleLinkSubmit(data, isEditingLink)"
      @close="closeLinkEditor"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import OpinionGraph from '../components/OpinionGraph.vue';
import OpinionEditor from '../components/OpinionEditor.vue';
import LinkEditor from '../components/LinkEditor.vue';
import PageHeader from './DebateOpinion/PageHeader.vue';
import SearchOverlay from './DebateOpinion/SearchOverlay.vue';
import HelpSection from './DebateOpinion/HelpSection.vue';

import { useOpinionGraph } from '@/composables/useOpinionGraph';
import { useEditorState } from './DebateOpinion/useEditorState';
import { useDebateSearch } from './DebateOpinion/useDebateSearch';
import { useFormHandlers } from './DebateOpinion/useFormHandlers';
import { useContextMenuActions } from './DebateOpinion/useContextMenuActions';

import type { Node, Edge, OpinionFormData, LinkFormData } from '@/types';

const route = useRoute();
const debateId = route.params.id as string;

// 使用主要的图形组合函数
const {
  elements,
  availableNodes,
  // error, // 移除未使用的变量
  selectedNode,
  selectedEdge,
  searchQuery,
  searchOpinions,
  searchLoading,
  handleNodeArrowClick,
  initializeGraph,
  searchAndFocusOpinion,
  // 这些方法需要在useOpinionGraph中实现
  createOpinion,
  updateOpinion,
  deleteOpinion,
  createLink,
  updateLink,
  deleteLink,
  setSelectedNode,
  setSelectedEdge,
} = useOpinionGraph(debateId);

// 编辑器状态管理
const {
  showOpinionEditor,
  isEditingOpinion,
  showLinkEditor,
  isEditingLink,
  openOpinionEditor,
  closeOpinionEditor,
  openLinkEditor,
  closeLinkEditor,
} = useEditorState();

// 搜索功能
const {
  selectedSearchOpinion,
  handleSearchInput: handleSearchInputBase,
  handleSearchSelection: handleSearchSelectionBase,
} = useDebateSearch();

// 表单处理 - 创建适配器函数以匹配 useFormHandlers 的期望签名
const {
  handleOpinionSubmit,
  handleLinkSubmit,
  handleOpinionDelete,
  handleLinkDelete,
} = useFormHandlers(
  async (data: OpinionFormData) => { 
    await createOpinion({
      logic_type: data.logic_type,
      content: data.content,
      parent_id: data.parent_id,
      son_ids: data.son_ids,
      link_type: data.link_type,
      positive_score: data.positive_score,
      is_llm_score: data.is_llm_score,
      creator: data.creator,
    }); 
  },
  async (data: OpinionFormData) => { 
    if (data.id) {
      await updateOpinion({
        id: data.id,
        content: data.content,
        positive_score: data.positive_score,
        is_llm_score: data.is_llm_score,
      }); 
    }
  },
  async (opinionId: string) => { await deleteOpinion(opinionId); },
  async (data: LinkFormData) => { 
    await createLink({
      from_id: data.from_id,
      to_id: data.to_id,
      link_type: data.link_type,
    }); 
  },
  async (data: LinkFormData) => { 
    if (data.id) {
      await updateLink({
        id: data.id,
        link_type: data.link_type,
      }); 
    }
  },
  async (linkId: string) => { await deleteLink(linkId); },
  closeOpinionEditor,
  closeLinkEditor
);

// 右键菜单动作
const {
  handleContextMenuAction,
} = useContextMenuActions(
  selectedNode,
  selectedEdge,
  openOpinionEditor,
  openLinkEditor,
  handleOpinionDelete,
  handleLinkDelete,
  async () => {
    await initializeGraph();
  },
  () => {
    opinionGraphRef.value?.fitToView();
  }
);

// 组件引用
const opinionGraphRef = ref<InstanceType<typeof OpinionGraph> | null>(null);

// 图形布局配置
const graphLayout = {
  name: 'dagre',
  rankDir: 'BT',
  nodeSep: 50,
  edgeSep: 10,
  rankSep: 80,
  fit: false, // 加载节点时不适配屏幕
  padding: 50,
};

// 处理搜索输入
const handleSearchInput = async (searchValue: string | null) => {
  await handleSearchInputBase(searchValue, async () => {
    // 触发搜索逻辑
  });
};

// 处理搜索选择
const handleSearchSelection = async (opinionId: string | null) => {
  await handleSearchSelectionBase(opinionId, searchAndFocusOpinion);
  
  // 居中到选中的观点
  if (opinionId && opinionGraphRef.value) {
    opinionGraphRef.value.centerOnNode(opinionId);
  }
};

// 处理节点选择
const handleNodeSelected = (nodeData: Node | null) => {
  console.log('[handleNodeSelected] 节点选择事件:', nodeData);
  if (nodeData) {
    setSelectedNode(nodeData);
  }
};

// 处理边选择
const handleEdgeSelected = (edgeData: Edge | null) => {
  console.log('[handleEdgeSelected] 边选择事件:', edgeData);
  if (edgeData) {
    setSelectedEdge(edgeData);
  }
};

// 初始化
onMounted(async () => {
  try {
    await initializeGraph();
  } catch (error) {
    console.error('初始化失败:', error);
  }
});
</script>

<style scoped>
.opinion-page {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.graph-container {
  height: 60vh;
  min-height: 500px;
}
</style>
