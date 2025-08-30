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

import { useOpinionGraph } from '@/composables';
import { useEditorState } from '@/composables/features/opinion/useEditorState';
import { useDebateSearch } from '@/composables/features/debate/useDebateSearch';
import { useCRUDWrapper } from '@/composables/features/opinion/useCRUDFixes';

import type { Node, Edge, OpinionFormData, LinkFormData } from '@/types';

const route = useRoute();
const debateId = route.params.id as string;

// 使用主要的图形组合函数
const {
  elements,
  availableNodes,
  selectedNode,
  selectedEdge,
  searchQuery,
  searchOpinions,
  searchLoading,
  handleNodeArrowClick,
  initializeGraph,
  searchAndFocusOpinion,
  createOpinion,
  updateOpinion,
  deleteOpinion,
  createLink,
  updateLink,
  deleteLink,
  setSelectedNode,
  setSelectedEdge,
} = useOpinionGraph(debateId);

// CRUD修复工具
//TODO：有必要吗
const { wrapCRUDOperation } = useCRUDWrapper();

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

// CRUD 操作处理函数
const handleOpinionSubmit = async (data: OpinionFormData, isEdit: boolean) => {
  const operation = async () => {
    if (isEdit) {
      return await updateOpinion({
        id: data.id!,
        content: data.content,
        positive_score: data.positive_score,
        is_llm_score: data.is_llm_score,
      });
    } else {
      return await createOpinion({
        logic_type: data.logic_type,
        content: data.content,
        parent_id: data.parent_id,
        son_ids: data.son_ids,
        link_type: data.link_type,
        positive_score: data.positive_score,
        is_llm_score: data.is_llm_score,
        creator: data.creator,
      });
    }
  };

  await wrapCRUDOperation(
    operation,
    isEdit ? '观点更新成功' : '观点创建成功',
    isEdit ? '观点更新失败' : '观点创建失败',
  );

  closeOpinionEditor();
};

const handleLinkSubmit = async (data: LinkFormData, isEdit: boolean) => {
  const operation = async () => {
    if (isEdit) {
      return await updateLink({
        id: data.id!,
        link_type: data.link_type,
      });
    } else {
      return await createLink({
        from_id: data.from_id,
        to_id: data.to_id,
        link_type: data.link_type,
      });
    }
  };

  await wrapCRUDOperation(
    operation,
    isEdit ? '连接更新成功' : '连接创建成功',
    isEdit ? '连接更新失败' : '连接创建失败',
  );

  closeLinkEditor();
};

const handleOpinionDelete = async (opinionId: string) => {
  if (!confirm('确定要删除这个观点吗？')) {
    return;
  }

  const operation = async () => {
    return await deleteOpinion(opinionId);
  };

  await wrapCRUDOperation(operation, '观点删除成功', '删除观点失败');

  closeOpinionEditor();
};

const handleLinkDelete = async (linkId: string) => {
  if (!confirm('确定要删除这个连接吗？')) {
    return;
  }

  const operation = async () => {
    return await deleteLink(linkId);
  };

  await wrapCRUDOperation(operation, '连接删除成功', '删除连接失败');

  closeLinkEditor();
};

// 右键菜单动作
const handleContextMenuAction = async (action: string) => {
  switch (action) {
    case 'editOpinion':
      if (selectedNode.value) {
        openOpinionEditor(true);
      }
      break;
    case 'deleteOpinion':
      if (selectedNode.value) {
        await handleOpinionDelete(selectedNode.value.id);
      }
      break;
    case 'addOpinion':
      openOpinionEditor(false);
      break;
    case 'editLink':
      if (selectedEdge.value) {
        openLinkEditor(true);
      }
      break;
    case 'deleteLink':
      if (selectedEdge.value) {
        await handleLinkDelete(selectedEdge.value.id);
      }
      break;
    case 'addLink':
      openLinkEditor(false);
      break;
    case 'refreshView':
      await initializeGraph();
      break;
    case 'fitToScreen':
      opinionGraphRef.value?.fitToView();
      break;
  }
};

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
