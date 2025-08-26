<template>
  <v-container class="settings-page">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card elevation="2">
          <v-card-title class="text-h4 pa-6">
            <v-icon left class="mr-3">mdi-cog</v-icon>
            设置
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-6">
            <v-form @submit.prevent="saveSettings">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model.number="maxUpdatedSon"
                    label="单节点单向初加载的一层节点数"
                    type="number"
                    :min="1"
                    variant="outlined"
                    prepend-inner-icon="mdi-chart-tree"
                    :rules="[(v) => v >= 1 || '值必须大于等于1']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model.number="numClickUpdatedSon"
                    label="单节点双击加载的一层节点数"
                    type="number"
                    :min="1"
                    variant="outlined"
                    prepend-inner-icon="mdi-mouse"
                    :rules="[(v) => v >= 1 || '值必须大于等于1']"
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model.number="loadDepth"
                    label="单节点加载深度"
                    type="number"
                    :min="1"
                    :max="5"
                    variant="outlined"
                    prepend-inner-icon="mdi-layers"
                    :rules="[(v) => (v >= 1 && v <= 5) || '值必须在1-5之间']"
                    hint="初始或双击时向下加载的深度层级（1-5）"
                    persistent-hint
                  />
                </v-col>

                <v-col cols="12">
                  <v-text-field
                    v-model.number="maxLoadNodes"
                    label="每次最大加载节点数"
                    type="number"
                    :min="1"
                    :max="100"
                    variant="outlined"
                    prepend-inner-icon="mdi-sitemap"
                    :rules="[(v) => (v >= 1 && v <= 100) || '值必须在1-100之间']"
                    hint="限制单次操作加载的总节点数量"
                    persistent-hint
                  />
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-6">
            <v-spacer />
            <v-btn
              color="primary"
              variant="elevated"
              size="large"
              @click="saveSettings"
              prepend-icon="mdi-content-save"
            >
              保存设置
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- 成功提示 -->
    <v-snackbar v-model="showSnackbar" color="success" timeout="3000" location="top">
      <v-icon left>mdi-check-circle</v-icon>
      设置已保存
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const maxUpdatedSon = ref(5);
const numClickUpdatedSon = ref(5);
const loadDepth = ref(2);
const maxLoadNodes = ref(10);
const showSnackbar = ref(false);

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
  showSnackbar.value = true;
}
</script>

<style scoped>
.settings-page {
  padding-top: 2rem;
}
</style>
