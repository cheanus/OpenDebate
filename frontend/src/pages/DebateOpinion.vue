<template>
    <div class="opinion-page">
        <OpinionGraph :elements="elements" :layout="{ name: 'breadthfirst', directed: true, padding: 10 }"
            @nodeDblClick="onNodeDblClick" @viewportChanged="onViewportChanged" />
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
const nodeChildren = ref({})
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
    // 加载本辩论最早的观点节点
    const res = await fetch(`/api/opinion/query?debate_id=${debateId}&is_time_accending=true&max_num=1`)
    const data = await res.json()
    if (data?.data?.length) {
        const root = data.data[0]
        addNode(root)
        await loadChildren(root.id, maxUpdatedSon.value)
    }
}

function addNode(node) {
    if (loadedNodes.value.has(node.id)) return
    elements.value = [
        ...elements.value,
        {
            data: {
                id: node.id,
                label: node.content?.slice(0, 18) || '观点',
                ...node,
                positive_score: node.score?.positive,
                negative_score: node.score?.negative
            },
            classes: node.logic_type === 'and' ? 'and-node' : 'or-node'
        }
    ]
    loadedNodes.value.add(node.id)
}

function addEdge(edge) {
    if (loadedEdges.value.has(edge.id)) return
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
    let children = []
    let links = []
    for (let linkId of childLinks) {
        const linkRes = await fetch(`/api/link/info?link_id=${linkId}`)
        const link = await linkRes.json()
        if (link?.id) {
            // 获取子节点
            const childId = link.to_id
            const childRes = await fetch(`/api/opinion/info?opinion_id=${childId}&debate_id=${debateId}`)
            const childData = await childRes.json()
            if (childData?.data) {
                children.push(childData.data)
                links.push(link)
            }
        }
    }
    // 按节点大小降序
    children.sort((a, b) => {
        const sa = (a.score?.positive ?? 0) + (a.score?.negative ?? 0)
        const sb = (b.score?.positive ?? 0) + (b.score?.negative ?? 0)
        return sb - sa
    })
    nodeChildren.value[parentId] = children.map(c => c.id)
    // 先添加需要渲染的子节点
    for (let i = 0; i < Math.min(num, children.length); i++) {
        addNode(children[i])
    }
    // 再添加这些子节点对应的边（确保source/target都已添加）
    for (let i = 0; i < Math.min(num, links.length); i++) {
        const link = links[i]
        // 确保source和target都已添加
        if (!loadedNodes.value.has(link.from_id)) {
            const sourceRes = await fetch(`/api/opinion/info?opinion_id=${link.from_id}&debate_id=${debateId}`)
            const sourceData = await sourceRes.json()
            if (sourceData?.data) {
                addNode(sourceData.data)
            }
        }
        if (!loadedNodes.value.has(link.to_id)) {
            const targetRes = await fetch(`/api/opinion/info?opinion_id=${link.to_id}&debate_id=${debateId}`)
            const targetData = await targetRes.json()
            if (targetData?.data) {
                addNode(targetData.data)
            }
        }
        addEdge(link)
    }
}

async function onNodeDblClick(nodeData, event) {
    // 阻止默认行为和冒泡，避免元数据栏弹出
    if (event) {
        event.preventDefault()
        event.stopPropagation()
    }
    // 双击加载更多子节点
    await loadChildren(nodeData.id, numClickUpdatedSon.value)
}

function onViewportChanged(extent) {
    // 屏幕移动时动态加载可见节点的子节点
    // 这里可根据extent判断哪些节点在视野内，动态加载
    // 简化处理：每次移动都尝试为已加载节点补充子节点
    Object.keys(nodeChildren.value).forEach(async pid => {
        if (nodeChildren.value[pid]) {
            for (let cid of nodeChildren.value[pid]) {
                if (!loadedNodes.value.has(cid)) {
                    // 加载未加载的子节点
                    const childRes = await fetch(`/api/opinion/info?opinion_id=${cid}&debate_id=${debateId}`)
                    const childData = await childRes.json()
                    if (childData?.data) {
                        addNode(childData.data)
                    }
                }
            }
        }
    })
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
