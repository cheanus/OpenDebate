<template>
  <v-app>
    <!-- 顶部导航栏 -->
    <v-app-bar elevation="2" color="primary" dark>
      <v-app-bar-title class="text-h5 font-weight-bold">
        <v-icon left class="mr-2">mdi-forum</v-icon>
        OpenDebate
      </v-app-bar-title>

      <v-spacer />

      <v-btn
        :to="{ name: 'debates' }"
        variant="text"
        prepend-icon="mdi-view-dashboard"
        class="mr-2"
      >
        辩论总览
      </v-btn>

      <v-btn :to="{ name: 'ai-maker' }" variant="text" prepend-icon="mdi-robot" class="mr-2">
        AI 生成
      </v-btn>

      <v-btn :to="{ name: 'settings' }" variant="text" prepend-icon="mdi-cog"> 设置 </v-btn>
    </v-app-bar>

    <!-- 主要内容区域 -->
    <v-main>
      <router-view />
    </v-main>

    <!-- 通知容器 -->
    <NotificationContainer />
  </v-app>
</template>

<script setup lang="ts">
import NotificationContainer from './components/NotificationContainer.vue';
</script>

<style scoped>
/* 可以添加一些全局样式覆盖 */
</style>
