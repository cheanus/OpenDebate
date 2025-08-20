<template>
  <div id="app">
    <nav class="main-nav">
      <router-link to="/">辩论总览</router-link>
      <router-link to="/settings">设置</router-link>
    </nav>
    <router-view @viewDebate="goToDebate" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
function goToDebate(id) {
  router.push(`/debate/${id}`);
}
</script>

<style scoped>
#app {
  min-height: 100vh;
  background: var(--background);
}

.main-nav {
  display: flex;
  gap: 32px;
  padding: 0 48px;
  height: 64px;
  align-items: center;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  margin-bottom: 32px;
  box-shadow: 0 2px 8px rgba(30, 41, 59, 0.03);
}

.main-nav a {
  color: var(--text-light);
  text-decoration: none;
  font-weight: 600;
  font-size: 20px;
  letter-spacing: 0.02em;
  padding: 4px 0;
  transition:
    color 0.2s,
    border-bottom 0.2s;
  border-bottom: 2px solid transparent;
}
.main-nav a.router-link-exact-active {
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
}
</style>
