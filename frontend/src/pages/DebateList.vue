<template>
  <div class="debate-list">
    <h1>辩论总览</h1>
    <div class="search-bar">
      <input v-model="search.title" placeholder="标题关键词" />
      <input v-model="search.creator" placeholder="创建者" />
      <button @click="fetchDebates">搜索</button>
      <button class="create-btn" @click="showCreate = true">新建辩论</button>
    </div>
    <table class="debate-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>描述</th>
          <th>创建者</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="debate in debates" :key="debate.id">
          <td :title="debate.title">{{ debate.title }}</td>
          <td :title="debate.description">{{ debate.description }}</td>
          <td :title="debate.creator">{{ debate.creator }}</td>
          <td>{{ new Date(debate.created_at).toLocaleString() }}</td>
          <td>
            <button @click="$emit('viewDebate', debate.id)">查看</button>
            <button @click="editDebate(debate)">编辑</button>
            <button @click="deleteDebate(debate.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 新建/编辑弹窗 -->
    <div v-if="showCreate || showEdit" class="modal">
      <div class="modal-content">
        <h2>{{ showEdit ? '编辑辩论' : '新建辩论' }}</h2>
        <form @submit.prevent="showEdit ? submitEdit() : submitCreate()">
          <div>
            <label>标题</label>
            <input v-model="form.title" required />
          </div>
          <div>
            <label>描述</label>
            <textarea v-model="form.description"></textarea>
          </div>
          <div>
            <label>创建者</label>
            <input v-model="form.creator" required />
          </div>
          <div class="modal-actions">
            <button type="submit">确定</button>
            <button type="button" @click="closeModal">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Debate } from '@/types';

const debates = ref<Array<Debate>>([]);
const search = ref({ title: '', creator: '' });
const showCreate = ref(false);
const showEdit = ref(false);
const form = ref({ id: '', title: '', description: '', creator: '' });

async function fetchDebates() {
  let url = '/api/debate/query?';
  if (search.value.title) url += `title=${encodeURIComponent(search.value.title)}&`;
  if (search.value.creator) url += `creator=${encodeURIComponent(search.value.creator)}&`;
  const res = await fetch(url);
  if (res.ok) {
    const result = await res.json();
    debates.value = result.data;
  }
}

function closeModal() {
  showCreate.value = false;
  showEdit.value = false;
  form.value = { id: '', title: '', description: '', creator: '' };
}

function editDebate(debate: Debate) {
  form.value = { ...debate };
  showEdit.value = true;
}

async function submitCreate() {
  const res = await fetch('/api/debate/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: form.value.title,
      description: form.value.description,
      creator: form.value.creator,
    }),
  });
  if (res.ok) {
    closeModal();
    fetchDebates();
  }
}

async function submitEdit() {
  const res = await fetch('/api/debate/patch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: form.value.id,
      title: form.value.title,
      description: form.value.description,
      creator: form.value.creator,
    }),
  });
  if (res.ok) {
    closeModal();
    fetchDebates();
  }
}

async function deleteDebate(id: string) {
  if (!confirm('确定要删除该辩论吗？')) return;
  const res = await fetch('/api/debate/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (res.ok) fetchDebates();
}

onMounted(fetchDebates);
</script>

<style scoped>
.debate-list {
  max-width: 980px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 40px 36px 32px 36px;
}

.actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
}

.actions button {
  font-size: 1.1em;
  padding: 0.5em 1.6em;
}

.search-bar {
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-bar input {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.5em 1em;
  font-size: 1em;
  background: var(--secondary);
  outline: none;
  transition: border 0.2s;
  flex: 1; /* 让输入框自动填满剩余空间 */
  min-width: 0; /* 防止溢出 */
}

.search-bar button {
  width: auto; /* 宽度自适应内容 */
  white-space: nowrap; /* 不换行 */
  flex-shrink: 0; /* 按钮不被压缩 */
}

.debate-table {
  flex-wrap: wrap;
  justify-content: flex-end;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: var(--card-bg);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(30, 41, 59, 0.04);
}

.debate-table th {
  background: var(--secondary);
  color: var(--text-light);
  font-weight: 600;
  padding: 12px 10px;
  border-bottom: 2px solid var(--border);
  text-align: center; /* 新增：表头居中 */
}

.debate-table td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  text-align: center; /* 新增：单元格内容居中 */
}

.debate-table tr:last-child td {
  border-bottom: none;
}

.debate-table button {
  margin-right: 8px;
  font-size: 0.98em;
  padding: 0.4em 1.1em;
}

.modal {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(30, 41, 59, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg);
  padding: 36px 32px 28px 32px;
  border-radius: var(--radius);
  min-width: 340px;
  box-shadow: var(--shadow);
}

.modal-content h2 {
  margin-bottom: 18px;
}

.modal-content label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-light);
  font-size: 0.98em;
}

.modal-content input,
.modal-content textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 1em;
  margin-bottom: 16px;
  background: var(--secondary);
  outline: none;
  transition: border 0.2s;
}

.modal-content input:focus,
.modal-content textarea:focus {
  border: 1.5px solid var(--primary);
}

.modal-actions {
  margin-top: 10px;
  display: flex;
  gap: 16px;
  justify-content: flex-end;
}

.modal-actions button {
  min-width: 80px;
}

@media (max-width: 900px) {
  .debate-list {
    padding: 16px 4px;
  }

  .modal-content {
    padding: 18px 6px 12px 6px;
    min-width: 0;
  }
}
</style>
