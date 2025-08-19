<template>
    <div class="opinion-page">
        <!-- 修改节点布局配置，启用cose动画 -->
        <OpinionGraph :elements="elements"
            :layout="{ name: 'dagre', rankDir: 'BT', nodeSep: 50, edgeSep: 10, rankSep: 80, fit: true, padding: 50 }"
            @nodeDblClick="onNodeDblClick" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import OpinionGraph from '../components/OpinionGraph.vue'

const route = useRoute()
const debateId = route.params.id
const elements = ref([])
const loadedNodes = ref(new Set())
const loadedEdges = ref(new Set())
const maxUpdatedSon = ref(5)
const numClickUpdatedSon = ref(5)

function getSettings() {
    const s = localStorage.getItem('debate_settings')
    if (s) {
        try {
            const obj = JSON.parse(s)
            if (obj.maxUpdatedSon) maxUpdatedSon.value = obj.maxUpdatedSon
            if (obj.numClickUpdatedSon) numClickUpdatedSon.value = obj.numClickUpdatedSon
        } catch { }
    }
}

onMounted(() => {
    getSettings()
    loadInitialNodes()
})

async function loadInitialNodes() {
    // 先加载所有叶节点
    const res = await fetch(`/api/opinion/head`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debate_id: debateId, is_leaf: true })
    });
    const leafData = await res.json();
    if (leafData?.data && leafData.data.length) {
        for (const leafId of leafData.data) {
            const nodeRes = await fetch(`/api/opinion/info?opinion_id=${leafId}&debate_id=${debateId}`);
            const nodeData = await nodeRes.json();
            if (nodeData?.data) {
                await addNode(nodeData.data);
                await loadChildren(nodeData.data.id, maxUpdatedSon.value);
            }
        }
    }
}

async function addNode(node, hasMore = null) {
    if (loadedNodes.value.has(node.id)) return
    let finalHasMore = hasMore
    if (hasMore === null) {
        // 查询该节点是否有子节点
        const res = await fetch(`/api/opinion/info?opinion_id=${node.id}&debate_id=${debateId}`)
        const data = await res.json()
        if (data?.data?.relationship) {
            const rel = data.data.relationship
            finalHasMore = (rel.supported_by && rel.supported_by.length > 0) ||
                (rel.opposed_by && rel.opposed_by.length > 0)
        } else {
            finalHasMore = false
        }
    }
    elements.value = [
        ...elements.value,
        {
            data: {
                id: node.id,
                label: node.content?.slice(0, 18) || '观点',
                ...node,
                positive_score: node.score?.positive,
                negative_score: node.score?.negative,
                has_more_children: finalHasMore
            },
            classes: node.logic_type === 'and' ? 'and-node' : 'or-node'
        }
    ]
    loadedNodes.value.add(node.id)
}

function addEdge(edge) {
    // 检测这条边是否已经存在
    if (loadedEdges.value.has(edge.id)) return
    // 添加边到元素列表
    elements.value = [
        ...elements.value,
        {
            data: {
                id: edge.id,
                source: edge.from_id,
                target: edge.to_id,
                link_type: edge.link_type
            }
        }
    ]
    loadedEdges.value.add(edge.id)
}

async function loadChildren(parentId, num) {
    // 查询parentId的子观点（支持/反驳），按节点大小降序
    const res = await fetch(`/api/opinion/info?opinion_id=${parentId}&debate_id=${debateId}`)
    const data = await res.json()
    if (!data?.data) return
    const rel = data.data.relationship
    let childLinks = [...(rel.supported_by || []), ...(rel.opposed_by || [])]
    let pairs = []
    for (let linkId of childLinks) {
        const linkRes = await fetch(`/api/link/info?link_id=${linkId}`)
        const link = await linkRes.json()
        if (link?.id) {
            // 获取子节点
            const childId = link.from_id
            const childRes = await fetch(`/api/opinion/info?opinion_id=${childId}&debate_id=${debateId}`)
            const childData = await childRes.json()
            if (childData?.data) {
                pairs.push({ child: childData.data, link })
            }
        }
    }
    // 按节点得分降序排序
    pairs.sort((a, b) => {
        const sa = (a.child.score?.positive ?? 0) + (a.child.score?.negative ?? 0)
        const sb = (b.child.score?.positive ?? 0) + (b.child.score?.negative ?? 0)
        return sb - sa
    })
    // 判断是否还有未加载的子节点
    const hasMore = pairs.length > num
    // 加载未存在的子节点直到达到num个
    let addedCount = 0
    for (let p of pairs) {
        if (addedCount >= num) break
        // 添加新子节点
        await addNode(p.child)
        addEdge(p.link)
        if (loadedNodes.value.has(p.child.id)) continue
        addedCount++
    }
    // 更新父节点的has_more_children属性
    updateNodeHasMore(parentId, hasMore)
}

function updateNodeHasMore(nodeId, hasMore) {
    // 更新elements中对应节点的has_more_children属性
    elements.value = elements.value.map(el => {
        if (el.data && el.data.id === nodeId) {
            return {
                ...el,
                data: {
                    ...el.data,
                    has_more_children: hasMore
                }
            }
        }
        return el
    })
}

async function onNodeDblClick(nodeData, event) {
    // 如果节点没有更多子节点，直接返回
    if (!nodeData.has_more_children) return
    // 阻止默认行为和冒泡，避免元数据栏弹出
    if (event) {
        event.preventDefault()
        event.stopPropagation()
    }
    // 双击加载更多子节点
    await loadChildren(nodeData.id, numClickUpdatedSon.value)
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
</style>
