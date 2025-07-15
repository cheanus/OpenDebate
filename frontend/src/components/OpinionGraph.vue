<template>
    <div ref="cyContainer" class="cytoscape-container"></div>
    <div v-if="selectedNode" class="meta-panel" :style="metaPanelStyle">
        <h3>节点元数据</h3>
        <div v-for="(v, k) in selectedNodeData" :key="k">
            <b>{{ k }}:</b> {{ v }}
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import cytoscape from 'cytoscape'

const props = defineProps({
    elements: Array, // [{ data: { id, label, ... }, classes: '' }, ...]
    layout: Object,
    styleOptions: Object
})

const emit = defineEmits(['nodeDblClick', 'viewportChanged'])
const cyContainer = ref(null)
let cy = null
const selectedNode = ref(null)
const selectedNodeData = ref({})
const metaPanelStyle = ref({})
let tapTimer = null // 新增延时定时器

function getNodeSize(node) {
    // 依据正证分、反证分平均值调整节点大小
    const pos = node.data('positive_score')
    const neg = node.data('negative_score')
    let avg = null
    if (pos != null && neg != null) avg = (pos + neg) / 2
    else if (pos != null) avg = pos
    else if (neg != null) avg = neg
    if (avg == null) return 20
    return 30 + 60 * avg // 最小30，最大90
}

onMounted(() => {
    nextTick(() => {
        cy = cytoscape({
            container: cyContainer.value,
            elements: props.elements,
            layout: props.layout || { name: 'breadthfirst', directed: true, padding: 10 },
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': ele => ele.data('logic_type') === 'and' ? '#4f8cff' : '#00b894',
                        'label': 'data(label)',
                        'width': ele => getNodeSize(ele),
                        'height': ele => getNodeSize(ele),
                        'font-size': 14,
                        'color': '#222',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'border-width': 2,
                        'border-color': ele => ele.data('node_type') === 'solid' ? '#222' : '#bbb',
                        'opacity': 0.95
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 4,
                        'line-color': ele => ele.data('link_type') === 'supports' ? '#00b894' : '#e17055',
                        'target-arrow-color': ele => ele.data('link_type') === 'supports' ? '#00b894' : '#e17055',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.7
                    }
                }
            ]
        })
        cy.on('tap', 'node', evt => {
            if (tapTimer) clearTimeout(tapTimer)
            tapTimer = setTimeout(() => {
                selectedNode.value = evt.target
                // 创建元数据对象并去除relationship字段
                const data = { ...evt.target.data() }
                delete data.relationship
                delete data.label
                selectedNodeData.value = data
                // 计算元数据栏位置
                const pos = evt.position || evt.target.position()
                metaPanelStyle.value = {
                    left: `${pos.x + 40}px`,
                    top: `${pos.y}px`
                }
                tapTimer = null
            }, 300) // 调整延时毫秒数以匹配双击间隔
        })
        cy.on('tap', evt => {
            if (evt.target === cy) {
                selectedNode.value = null
                selectedNodeData.value = {}
            }
        })
        cy.on('dbltap', 'node', evt => {
            if (tapTimer) {
                clearTimeout(tapTimer)
                tapTimer = null
            }
            emit('nodeDblClick', evt.target.data())
        })
        cy.on('viewport', () => {
            emit('viewportChanged', cy.extent())
        })
    })
})

watch(() => props.elements, (newEls) => {
    if (cy) {
        cy.json({ elements: newEls })
        cy.layout(props.layout || { name: 'breadthfirst', directed: true, padding: 10 }).run()
    }
})
</script>

<style scoped>
.cytoscape-container {
    width: 100%;
    height: 70vh;
    background: #f8fafc;
    border-radius: 8px;
    box-shadow: 0 2px 8px #e0e7ef;
    margin-bottom: 24px;
    position: relative;
}

.meta-panel {
    position: absolute;
    min-width: 220px;
    background: #fff;
    border: 1px solid #e0e7ef;
    border-radius: 8px;
    box-shadow: 0 2px 8px #e0e7ef;
    padding: 16px;
    z-index: 10;
    top: 80px;
    left: 80px;
}
</style>
