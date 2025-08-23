<template>
  <div class="settings-page">
    <h1>设置</h1>
    <form class="settings-form" @submit.prevent>
      <div class="form-group">
        <label for="max-updated-son">单节点初始最大加载子节点数</label>
        <input id="max-updated-son" type="number" min="1" v-model.number="maxUpdatedSon" />
      </div>
      <div class="form-group">
        <label for="num-click-updated-son">双击加载的最大子节点数</label>
        <input
          id="num-click-updated-son"
          type="number"
          min="1"
          v-model.number="numClickUpdatedSon"
        />
      </div>
      <div class="form-group">
        <label for="load-depth">双击加载深度</label>
        <input
          id="load-depth"
          type="number"
          min="1"
          max="5"
          v-model.number="loadDepth"
        />
        <small class="hint">每次双击时向下加载的深度层级（1-5）</small>
      </div>
      <div class="form-group">
        <label for="max-load-nodes">每次最大加载节点数</label>
        <input
          id="max-load-nodes"
          type="number"
          min="1"
          max="100"
          v-model.number="maxLoadNodes"
        />
        <small class="hint">限制单次操作加载的总节点数量</small>
      </div>
      <button class="save-btn" @click="saveSettings">保存设置</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const maxUpdatedSon = ref(5);
const numClickUpdatedSon = ref(5);
const loadDepth = ref(2);
const maxLoadNodes = ref(10);

onMounted(() => {
  const s = localStorage.getItem('debate_settings');
  if (s) {
    try {
      const obj = JSON.parse(s);
      if (obj.maxUpdatedSon) maxUpdatedSon.value = obj.maxUpdatedSon;
      if (obj.numClickUpdatedSon) numClickUpdatedSon.value = obj.numClickUpdatedSon;
      if (obj.loadDepth) loadDepth.value = obj.loadDepth;
      if (obj.maxLoadNodes) maxLoadNodes.value = obj.maxLoadNodes;
    } catch {}
  }
});

function saveSettings() {
  localStorage.setItem(
    'debate_settings',
    JSON.stringify({
      maxUpdatedSon: maxUpdatedSon.value,
      numClickUpdatedSon: numClickUpdatedSon.value,
      loadDepth: loadDepth.value,
      maxLoadNodes: maxLoadNodes.value,
    }),
  );
  // window.$message?.success?.('设置已保存');
  alert('设置已保存');
}
</script>

<style scoped>
.settings-page {
  width: 70%;
  /* max-width: 480px; */
  margin: 40px auto;
  background: var(--color-gray-900);
  color: var(--color-text-primary);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  padding: 32px 40px 24px 40px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin-top: 32px;
}

.form-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

label {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 16px;
}

input[type='number'] {
  width: 120px;
  padding: 6px 10px;
  background: var(--color-gray-800);
  color: var(--color-text-primary);
  border: 1px solid #2B2A33;
  border-radius: 6px;
  font-size: 16px;
}

.hint {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-top: 4px;
  font-weight: normal;
}

.save-btn {
  width: 200px;
  margin: 16px auto 0;
  padding: 8px 24px;
  background: var(--primary, #4f8cff);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #2563eb;
}
</style>
