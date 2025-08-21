<template>
  <div class="opinion-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>辩论观点图</h2>
      <p>双击节点展开更多子观点，右键进行操作</p>
    </div>

    <!-- 图形组件 -->
    <OpinionGraph
      :elements="elements"
      :layout="{
        name: 'dagre',
        rankDir: 'BT',
        nodeSep: 50,
        edgeSep: 10,
        rankSep: 80,
        fit: true,
        padding: 50,
      }"
      @nodeDblClick="onNodeDblClick"
      @nodeSelected="onNodeSelected"
      @edgeSelected="onEdgeSelected"
      @contextMenuAction="onContextMenuAction"
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
      v-if="showOpinionEditorDialog"
      :isEdit="isEditingOpinion"
      :opinion="editingOpinion"
      :debateId="debateId"
      :availableNodes="availableNodesForEditor"
      @submit="handleOpinionSubmit"
      @close="closeOpinionEditor"
    />

    <!-- 连接编辑器 -->
    <LinkEditor
      v-if="showLinkEditorDialog"
      :isEdit="isEditingLink"
      :link="editingLink"
      :availableNodes="availableNodesForEditor"
      @submit="handleLinkSubmit"
      @close="closeLinkEditor"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import OpinionGraph from '../components/OpinionGraph.vue';
import OpinionEditor from '../components/OpinionEditor.vue';
import LinkEditor from '../components/LinkEditor.vue';
import type { Node, Element, Edge, OpinionFormData, LinkFormData, NodePair, ApiResponse } from '@/types';
import type { Core } from 'cytoscape';

const route = useRoute();
const debateId = route.params.id as string;
const elements = ref<Array<Element>>([]);
const loadedNodes = ref<Set<string>>(new Set());
const loadedEdges = ref<Set<string>>(new Set());
const maxUpdatedSon = ref(5);
const numClickUpdatedSon = ref(5);

// 选中状态
const selectedNodeData = ref<Node | null>(null);
const selectedEdgeData = ref<Edge | null>(null);
const opinionGraphRef = ref<{ cy: () => Core } | null>(null);

// 编辑器状态
const showOpinionEditorDialog = ref(false);
const showLinkEditorDialog = ref(false);
const isEditingOpinion = ref(false);
const isEditingLink = ref(false);
const editingOpinion = ref<Node | null>(null);
const editingLink = ref<Edge | null>(null);

// 计算可用节点列表供编辑器使用
const availableNodesForEditor = computed(() => {
  return elements.value
    .filter((el) => el.data && el.data.id && 'content' in el.data)
    .map((el) => el.data) as Array<Node>;
});

function getSettings() {
  const s = localStorage.getItem('debate_settings');
  if (s) {
    try {
      const obj = JSON.parse(s);
      if (obj.maxUpdatedSon) maxUpdatedSon.value = obj.maxUpdatedSon;
      if (obj.numClickUpdatedSon) numClickUpdatedSon.value = obj.numClickUpdatedSon;
    } catch {}
  }
}

onMounted(() => {
  getSettings();
  loadInitialNodes();
});

async function loadInitialNodes() {
  // 先加载所有叶节点
  const res = await fetch(`/api/opinion/head`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ debate_id: debateId, is_leaf: true }),
  });
  const leafData = await res.json();
  if (leafData.data && leafData.data.length) {
    for (const leafId of leafData.data) {
      const nodeRes = await fetch(`/api/opinion/info?opinion_id=${leafId}&debate_id=${debateId}`);
      const nodeData = await nodeRes.json();
      if (nodeData.data) {
        await addNode(nodeData.data);
        await loadChildren(nodeData.data.id, maxUpdatedSon.value);
      }
    }
  }
}

async function addNode(node: Node, hasMore: boolean | null = null) {
  if (loadedNodes.value.has(node.id)) return;
  let finalHasMore = hasMore;
  if (hasMore === null) {
    // 查询该节点是否有子节点
    const res = await fetch(`/api/opinion/info?opinion_id=${node.id}&debate_id=${debateId}`);
    const data = await res.json();
    if (data.data.relationship) {
      const rel = data.data.relationship;
      finalHasMore =
        (rel.supported_by && rel.supported_by.length > 0) ||
        (rel.opposed_by && rel.opposed_by.length > 0);
    } else {
      finalHasMore = false;
    }
  }
  elements.value.push({
    data: {
      ...node,
      label: node.content.slice(0, 18) || '观点',
      positive_score: node.score.positive,
      negative_score: node.score.negative,
      has_more_children: finalHasMore as boolean,
    },
    classes: node.logic_type === 'and' ? 'and-node' : 'or-node',
  });
  loadedNodes.value.add(node.id);
}

function addEdge(edge: Edge) {
  console.log(edge);
  // 检测这条边是否已经存在
  if (loadedEdges.value.has(edge.id)) return;
  // 添加边到元素列表
  elements.value = [
    ...elements.value,
    {
      data: {
        id: edge.id,
        source: edge.from_id,
        target: edge.to_id,
        link_type: edge.link_type,
      },
    },
  ];
  loadedEdges.value.add(edge.id);
}

async function loadChildren(parentId: string, num: number) {
  // 查询parentId的子观点（支持/反驳），按节点大小降序
  const res = await fetch(`/api/opinion/info?opinion_id=${parentId}&debate_id=${debateId}`);
  const data = await res.json();
  if (!data.data) return;
  const rel = data.data.relationship;
  const childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])];
  const pairs = [];
  for (const linkId of childLinks) {
    const linkRes = await fetch(`/api/link/info?link_id=${linkId}`);
    const link = await linkRes.json();
    if (link.id) {
      // 获取子节点
      const childId = link.from_id;
      const childRes = await fetch(`/api/opinion/info?opinion_id=${childId}&debate_id=${debateId}`);
      const childData = await childRes.json();
      if (childData.data) {
        pairs.push({ child: childData.data, link });
      }
    }
  }
  // 按节点得分降序排序
  pairs.sort((a, b) => {
    const sa = (a.child.score.positive ?? 0) + (a.child.score.negative ?? 0);
    const sb = (b.child.score.positive ?? 0) + (b.child.score.negative ?? 0);
    return sb - sa;
  });
  // 判断是否还有未加载的子节点
  const hasMore = pairs.length > num;
  // 加载未存在的子节点直到达到num个
  let addedCount = 0;
  for (const p of pairs) {
    if (addedCount >= num) break;
    // 添加新子节点
    await addNode(p.child);
    addEdge(p.link);
    if (loadedNodes.value.has(p.child.id)) continue;
    addedCount++;
  }
  // 更新父节点的has_more_children属性
  updateNodeHasMore(parentId, hasMore);
}

function updateNodeHasMore(nodeId: string, hasMore: boolean) {
  // 更新elements中对应节点的has_more_children属性
  elements.value = elements.value.map((el) => {
    if (el.data && el.data.id === nodeId) {
      // return {
      //   ...el,
      //   data: {
      //     ...el.data,
      //     has_more_children: hasMore,
      //   },
      // };
      (el.data as Node).has_more_children = hasMore;
    }
    return el;
  });
}

async function onNodeDblClick(nodeData: Node) {
  // 如果节点没有更多子节点，直接返回
  if (!nodeData.has_more_children) return;
  
  // 双击加载更多子节点
  await loadChildren(nodeData.id, numClickUpdatedSon.value);
}

// 处理节点选中
function onNodeSelected(nodeData: Node | null) {
  selectedNodeData.value = nodeData;
  selectedEdgeData.value = null;
}

// 处理边选中
function onEdgeSelected(edgeData: Edge | null) {
  selectedEdgeData.value = edgeData;
  selectedNodeData.value = null;
}

// 处理右键菜单操作
function onContextMenuAction(action: string) {
  switch (action) {
    case 'addOpinion':
      showOpinionEditor();
      break;
    case 'editOpinion':
      editSelectedOpinion();
      break;
    case 'deleteOpinion':
      deleteSelectedOpinion();
      break;
    case 'addLink':
      showLinkEditor();
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
}

// 显示观点编辑器
function showOpinionEditor() {
  isEditingOpinion.value = false;
  editingOpinion.value = null;
  showOpinionEditorDialog.value = true;
}

// 编辑选中的观点
function editSelectedOpinion() {
  if (!selectedNodeData.value) return;
  isEditingOpinion.value = true;
  editingOpinion.value = selectedNodeData.value;
  showOpinionEditorDialog.value = true;
}

// 删除选中的观点
async function deleteSelectedOpinion() {
  if (!selectedNodeData.value) return;

  const confirmed = confirm(
    `确定要删除观点"${selectedNodeData.value.content.slice(0, 30)}..."吗？`,
  );
  if (!confirmed) return;

  try {
    const res = await fetch('/api/opinion/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opinion_id: selectedNodeData.value.id,
        debate_id: debateId,
      }),
    });

    const data = await res.json();
    if (data.is_success) {
      await refreshView();
      selectedNodeData.value = null;
      alert('观点删除成功');
    } else {
      alert(`删除失败: ${data.msg}`);
    }
  } catch (error) {
    console.error('删除观点失败:', error);
    alert('删除失败，请检查网络连接');
  }
}

// 显示连接编辑器
function showLinkEditor() {
  isEditingLink.value = false;
  editingLink.value = null;
  showLinkEditorDialog.value = true;
}

// 编辑选中的连接
function editSelectedLink() {
  if (!selectedEdgeData.value) return;
  isEditingLink.value = true;
  editingLink.value = selectedEdgeData.value;
  showLinkEditorDialog.value = true;
}

// 删除选中的连接
async function deleteSelectedLink() {
  if (!selectedEdgeData.value) return;

  const confirmed = confirm('确定要删除这个连接吗？');
  if (!confirmed) return;

  try {
    const res = await fetch('/api/link/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedEdgeData.value.id,
      }),
    });

    const data = await res.json();
    if (data.is_success) {
      await refreshView();
      selectedEdgeData.value = null;
      alert('连接删除成功');
    } else {
      alert(`删除失败: ${data.msg}`);
    }
  } catch (error) {
    console.error('删除连接失败:', error);
    alert('删除失败，请检查网络连接');
  }
}

// 处理观点提交
async function handleOpinionSubmit(formData: OpinionFormData) {
  try {
    let url, method;

    if (isEditingOpinion.value) {
      url = '/api/opinion/patch';
      method = 'POST';
    } else {
      if (formData.logic_type === 'and') {
        url = '/api/opinion/create_and';
      } else {
        url = '/api/opinion/create_or';
      }
      method = 'POST';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (data.is_success) {
      closeOpinionEditor();
      await refreshView();
      alert(isEditingOpinion.value ? '观点更新成功' : '观点创建成功');
    } else {
      alert(`操作失败: ${data.msg}`);
    }
  } catch (error) {
    console.error('提交观点失败:', error);
    alert('操作失败，请检查网络连接');
  }
}

// 处理连接提交
async function handleLinkSubmit(formData: LinkFormData) {
  try {
    let url = '/api/link/create';
    const method = 'POST';

    if (isEditingLink.value) {
      url = '/api/link/patch';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    if (data.is_success) {
      closeLinkEditor();
      await refreshView();
      alert(isEditingLink.value ? '连接更新成功' : '连接创建成功');
    } else {
      alert(`操作失败: ${data.msg}`);
    }
  } catch (error) {
    console.error('提交连接失败:', error);
    alert('操作失败，请检查网络连接');
  }
}

// 关闭观点编辑器
function closeOpinionEditor() {
  showOpinionEditorDialog.value = false;
  isEditingOpinion.value = false;
  editingOpinion.value = null;
}

// 关闭连接编辑器
function closeLinkEditor() {
  showLinkEditorDialog.value = false;
  isEditingLink.value = false;
  editingLink.value = null;
}

// 刷新视图
async function refreshView() {
  // 清空当前数据
  elements.value = [];
  loadedNodes.value.clear();
  loadedEdges.value.clear();
  selectedNodeData.value = null;
  selectedEdgeData.value = null;

  // 重新加载
  await loadInitialNodes();
}

// 适配屏幕
function fitToScreen() {
  const cyInstance = (opinionGraphRef.value as { cy: () => cytoscape.Core }).cy();
  if (cyInstance) {
    cyInstance.fit();
  }
}
</script>

<style scoped>
.opinion-page {
  max-width: 1200px;
  margin: 40px auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px #e0e7ef;
  padding: 32px 40px 24px 40px;
  min-height: 80vh;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e7ef;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.operation-hints {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.hint-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #495057;
  line-height: 1.4;
}

.hint-item strong {
  color: #2c3e50;
  margin-right: 8px;
  min-width: 80px;
}

@media (max-width: 768px) {
  .operation-hints {
    grid-template-columns: 1fr;
  }

  .hint-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .hint-item strong {
    min-width: auto;
    margin-right: 0;
  }
}
</style>
