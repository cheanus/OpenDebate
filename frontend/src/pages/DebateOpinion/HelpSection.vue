<template>
  <v-card class="ma-4" elevation="1">
    <v-card-title class="text-h6">
      <v-icon left>mdi-help-circle</v-icon>
      操作提示
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="12" sm="6" md="3">
          <div class="d-flex align-center mb-2">
            <v-icon color="primary" size="small" class="mr-2">mdi-arrow-up-down</v-icon>
            <strong>点击箭头：</strong>
          </div>
          <p class="text-body-2 ml-6">加载上级或下级观点</p>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="d-flex align-center mb-2">
            <v-icon color="secondary" size="small" class="mr-2">mdi-mouse-right-click</v-icon>
            <strong>右键节点：</strong>
          </div>
          <p class="text-body-2 ml-6">编辑、删除观点或添加连接</p>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="d-flex align-center mb-2">
            <v-icon color="info" size="small" class="mr-2">mdi-vector-line</v-icon>
            <strong>右键连接：</strong>
          </div>
          <p class="text-body-2 ml-6">编辑、删除连接</p>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="d-flex align-center mb-2">
            <v-icon color="accent" size="small" class="mr-2">mdi-magnify</v-icon>
            <strong>搜索观点：</strong>
          </div>
          <p class="text-body-2 ml-6">快速定位并加载相关观点</p>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
// 这个组件是纯静态的，不需要逻辑
</script>
