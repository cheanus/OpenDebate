<template>
  <div class="settings-page">
    <h1>设置</h1>
    <form class="settings-form" @submit.prevent>
      <div class="form-group">
        <label for="max-updated-son">单节点默认最大加载子节点数</label>
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
      <button class="save-btn" @click="saveSettings">保存设置</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const maxUpdatedSon = ref(5);
const numClickUpdatedSon = ref(5);

onMounted(() => {
  const s = localStorage.getItem('debate_settings');
  if (s) {
    try {
      const obj = JSON.parse(s);
      if (obj.maxUpdatedSon) maxUpdatedSon.value = obj.maxUpdatedSon;
      if (obj.numClickUpdatedSon) numClickUpdatedSon.value = obj.numClickUpdatedSon;
    } catch {}
  }
});

function saveSettings() {
  localStorage.setItem(
    'debate_settings',
    JSON.stringify({
      maxUpdatedSon: maxUpdatedSon.value,
      numClickUpdatedSon: numClickUpdatedSon.value,
    }),
  );
  // window.$message?.success?.('设置已保存');
  alert('设置已保存');
}
</script>

<style scoped>
.settings-page {
  max-width: 480px;
  margin: 40px auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px #e0e7ef;
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
  color: #222;
  font-size: 16px;
}

input[type='number'] {
  width: 120px;
  padding: 6px 10px;
  border: 1px solid #e0e7ef;
  border-radius: 6px;
  font-size: 16px;
}

.save-btn {
  margin-top: 16px;
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
