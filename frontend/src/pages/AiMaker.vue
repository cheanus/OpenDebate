<template>
  <v-container class="ai-maker-container" fluid>
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- 页面标题 -->
        <div class="text-center mb-8">
          <v-icon size="64" color="primary" class="mb-4">mdi-robot</v-icon>
          <h1 class="text-h3 font-weight-bold mb-2">AI 辩论生成器</h1>
          <p class="text-h6 text-medium-emphasis">
            输入一段话题描述，AI 将为您生成完整的辩论图
          </p>
        </div>

        <!-- 输入表单 -->
        <v-card elevation="4" rounded="lg" class="pa-6">
          <v-form @submit.prevent="handleCreateDebate">
            <v-textarea
              v-model="content"
              label="话题描述"
              placeholder="例如：人工智能的发展对社会的影响、气候变化的应对策略、在线教育的优势与劣势..."
              variant="outlined"
              rows="6"
              counter
              :rules="contentRules"
              :disabled="isCreating"
              class="mb-4"
            >
              <template #prepend-inner>
                <v-icon color="primary">mdi-text</v-icon>
              </template>
            </v-textarea>

            <!-- 提示信息 -->
            <v-alert
              v-if="!isCreating"
              type="info"
              variant="tonal"
              class="mb-4"
              text="AI 将分析您的话题，生成包含多个观点和论证关系的辩论图。这个过程可能需要30秒到2分钟，请耐心等待。"
            />

            <!-- 生成状态 -->
            <v-alert
              v-if="isCreating"
              type="warning"
              variant="tonal"
              class="mb-4"
            >
              <div class="d-flex align-center">
                <v-progress-circular
                  indeterminate
                  size="20"
                  class="mr-3"
                />
                <div>
                  <div class="font-weight-medium">AI 正在生成辩论图...</div>
                  <div class="text-caption">这可能需要1-2分钟，请耐心等待</div>
                </div>
              </div>
            </v-alert>

            <!-- 错误信息 -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>

            <!-- 操作按钮 -->
            <div class="d-flex gap-4">
              <v-btn
                type="submit"
                color="primary"
                size="large"
                :loading="isCreating"
                :disabled="!content.trim() || isCreating"
                prepend-icon="mdi-creation"
                block
              >
                {{ isCreating ? '生成中...' : '生成辩论图' }}
              </v-btn>
            </div>
          </v-form>
        </v-card>

        <!-- 使用指南 -->
        <v-expansion-panels class="mt-6" variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="mr-3">mdi-help-circle</v-icon>
              使用指南
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="text-body-1">
                <h3 class="mb-3">如何使用 AI 辩论生成器：</h3>
                <v-list density="compact">
                  <v-list-item>
                    <template #prepend>
                      <v-icon size="small">mdi-numeric-1-circle</v-icon>
                    </template>
                    <v-list-item-title>输入一个清晰的话题或问题</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon size="small">mdi-numeric-2-circle</v-icon>
                    </template>
                    <v-list-item-title>AI 将分析话题并生成相关观点</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon size="small">mdi-numeric-3-circle</v-icon>
                    </template>
                    <v-list-item-title>生成完成后会自动跳转到辩论观点页面</v-list-item-title>
                  </v-list-item>
                  <v-list-item>
                    <template #prepend>
                      <v-icon size="small">mdi-numeric-4-circle</v-icon>
                    </template>
                    <v-list-item-title>您可以继续编辑和完善生成的辩论图</v-list-item-title>
                  </v-list-item>
                </v-list>
                
                <h4 class="mt-4 mb-2">最佳实践：</h4>
                <ul class="pl-4">
                  <li>使用具体、明确的话题描述</li>
                  <li>避免过于宽泛或模糊的问题</li>
                  <li>可以包含一些上下文信息帮助 AI 理解</li>
                  <li>生成后可以随时添加、修改或删除观点</li>
                </ul>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifications } from '@/composables';
import { aiDebateService } from '@/services/ai_maker';

const router = useRouter();
const { notifySuccess, notifyError } = useNotifications();

// 响应式数据
const content = ref('');
const isCreating = ref(false);
const error = ref('');

// 表单验证规则
const contentRules = [
  (v: string) => !!v?.trim() || '请输入话题描述',
  (v: string) => (v?.trim().length >= 10) || '话题描述至少需要10个字符',
  (v: string) => (v?.trim().length <= 500) || '话题描述不能超过500个字符',
];

// 创建辩论
const handleCreateDebate = async () => {
  if (!content.value.trim()) {
    error.value = '请输入话题描述';
    return;
  }

  isCreating.value = true;
  error.value = '';

  try {
    const response = await aiDebateService.create({
      content: content.value.trim()
    });

    if (response.is_success && response.id) {
      notifySuccess('AI 辩论图生成成功！正在跳转到辩论观点页面...');

      // 跳转到生成的辩论页面
      await router.push({ 
        name: 'debate-opinion', 
        params: { id: response.id as string } 
      });
    } else {
      error.value = response.msg || '生成失败，请重试';
      notifyError(`辩论图生成失败：${error.value}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '网络错误，请检查连接后重试';
    error.value = errorMessage;
    notifyError(`生成过程中出现错误：${errorMessage}`);
  } finally {
    isCreating.value = false;
  }
};
</script>

<style scoped>
.ai-maker-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 2rem 0;
}

.v-card {
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95) !important;
}

.v-textarea :deep(.v-field) {
  border-radius: 12px;
}

.v-btn {
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.v-expansion-panel {
  border-radius: 12px !important;
  overflow: hidden;
}

.v-expansion-panel:not(:last-child) {
  margin-bottom: 8px;
}
</style>