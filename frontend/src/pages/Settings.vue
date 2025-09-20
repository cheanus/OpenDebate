<template>
  <v-container class="settings-page">
    <v-row justify="center">
      <v-col cols="12" md="8" lg="6">
        <!-- 账户设置卡片 -->
        <v-card elevation="2" class="mb-6">
          <v-card-title class="text-h4 pa-6">
            <v-icon left class="mr-3">mdi-account</v-icon>
            账户设置
          </v-card-title>

          <v-divider />

          <v-card-text class="pa-6">
            <!-- 已登录状态 -->
            <div v-if="isLogined && userInfo">
              <v-alert type="success" variant="tonal" class="mb-4" prepend-icon="mdi-check-circle">
                <strong>已登录</strong>
              </v-alert>

              <v-list class="py-0">
                <v-list-item prepend-icon="mdi-email">
                  <v-list-item-title>邮箱</v-list-item-title>
                  <v-list-item-subtitle>{{ userInfo.email }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item prepend-icon="mdi-account-circle">
                  <v-list-item-title>用户名</v-list-item-title>
                  <v-list-item-subtitle>{{ userInfo.username }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item prepend-icon="mdi-shield-account">
                  <v-list-item-title>角色</v-list-item-title>
                  <v-list-item-subtitle>{{ userInfo.is_superuser? "superuser": userInfo.role }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item prepend-icon="mdi-check-circle">
                  <v-list-item-title>账户状态</v-list-item-title>
                  <v-list-item-subtitle>
                    <!-- {{ userInfo.is_verified ? '已验证' : '未验证' }} -->
                    {{ userInfo.is_active ? '已激活' : '未激活' }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>

              <v-card-actions class="px-0 pt-4">
                <v-btn
                  color="error"
                  variant="outlined"
                  prepend-icon="mdi-logout"
                  @click="handleLogout"
                  :loading="authLoading"
                >
                  退出登录
                </v-btn>
              </v-card-actions>
            </div>

            <!-- 未登录状态 -->
            <div v-else>
              <v-alert type="info" variant="tonal" class="mb-4" prepend-icon="mdi-information">
                请登录以同步您的辩论数据
              </v-alert>

              <v-tabs v-model="authTab" class="mb-4">
                <v-tab value="login">登录</v-tab>
                <v-tab value="register">注册</v-tab>
              </v-tabs>

              <v-window v-model="authTab">
                <!-- 登录表单 -->
                <v-window-item value="login">
                  <v-form @submit.prevent="handleLogin" ref="loginForm">
                    <v-text-field
                      v-model="loginData.email"
                      label="邮箱"
                      type="email"
                      variant="outlined"
                      prepend-inner-icon="mdi-email"
                      :rules="[rules.required, rules.email]"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model="loginData.password"
                      label="密码"
                      type="password"
                      variant="outlined"
                      prepend-inner-icon="mdi-lock"
                      :rules="[rules.required]"
                      class="mb-4"
                    />
                    <v-btn
                      type="submit"
                      color="primary"
                      variant="elevated"
                      size="large"
                      block
                      :loading="authLoading"
                      prepend-icon="mdi-login"
                    >
                      登录
                    </v-btn>
                  </v-form>
                </v-window-item>

                <!-- 注册表单 -->
                <v-window-item value="register">
                  <v-form @submit.prevent="handleRegister" ref="registerForm">
                    <v-text-field
                      v-model="registerData.email"
                      label="邮箱"
                      type="email"
                      variant="outlined"
                      prepend-inner-icon="mdi-email"
                      :rules="[rules.required, rules.email]"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model="registerData.username"
                      label="用户名"
                      variant="outlined"
                      prepend-inner-icon="mdi-account"
                      :rules="[rules.required, rules.username]"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model="registerData.password"
                      label="密码"
                      type="password"
                      variant="outlined"
                      prepend-inner-icon="mdi-lock"
                      :rules="[rules.required, rules.password]"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model="confirmPassword"
                      label="确认密码"
                      type="password"
                      variant="outlined"
                      prepend-inner-icon="mdi-lock-check"
                      :rules="[rules.required, rules.confirmPassword]"
                      class="mb-4"
                    />
                    <v-btn
                      type="submit"
                      color="primary"
                      variant="elevated"
                      size="large"
                      block
                      :loading="authLoading"
                      prepend-icon="mdi-account-plus"
                    >
                      注册
                    </v-btn>
                  </v-form>
                </v-window-item>
              </v-window>
            </div>
          </v-card-text>
        </v-card>

        <!-- 图形设置卡片 -->
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

    <!-- 错误提示 -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000" location="top">
      <v-icon left>mdi-alert-circle</v-icon>
      {{ authError }}
    </v-snackbar>

    <!-- 成功提示 -->
    <v-snackbar v-model="successSnackbar" color="success" timeout="3000" location="top">
      <v-icon left>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuth } from '@/composables/core/useAuth';

// 使用 useAuth 组合函数
const {
  isLogined,
  userInfo,
  isLoading: authLoading,
  error: authError,
  login,
  logout,
  registerAndLogin,
  fetchUserInfo,
  clearError,
} = useAuth();

// 计算属性来控制错误提示显示
const showErrorSnackbar = computed({
  get: () => !!authError.value,
  set: () => clearError(),
});

// 原有的图形设置
const maxUpdatedSon = ref(5);
const numClickUpdatedSon = ref(5);
const loadDepth = ref(2);
const maxLoadNodes = ref(10);
const showSnackbar = ref(false);

// UI 状态
const authTab = ref('login');

// 表单数据
const loginData = ref({
  email: '',
  password: '',
});

const registerData = ref({
  email: '',
  username: '',
  password: '',
});

const confirmPassword = ref('');

// 表单引用
const loginForm = ref();
const registerForm = ref();

// 成功提示
const successSnackbar = ref(false);
const successMessage = ref('');

// 表单验证规则
const rules = {
  required: (value: string) => !!value || '此字段为必填项',
  email: (value: string) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value) || '请输入有效的邮箱地址';
  },
  username: (value: string) => {
    return (value && value.length >= 3) || '用户名至少需要3个字符';
  },
  password: (value: string) => {
    return (value && value.length >= 6) || '密码至少需要6个字符';
  },
  confirmPassword: (value: string) => {
    return value === registerData.value.password || '两次输入的密码不一致';
  },
};

onMounted(async () => {
  // 加载图形设置
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

  // 尝试获取用户信息（首次加载不显示错误）
  await fetchUserInfo(true);
});

// 处理登录
async function handleLogin() {
  const form = loginForm.value;
  if (!(await form?.validate())?.valid) return;

  try {
    clearError();
    await login(loginData.value);

    // 清空表单
    loginData.value = { email: '', password: '' };

    showSuccess('登录成功！');
  } catch {
    // 错误已经在 useAuth 中处理
  }
}

// 处理注册
async function handleRegister() {
  const form = registerForm.value;
  if (!(await form?.validate())?.valid) return;

  try {
    clearError();
    await registerAndLogin(registerData.value);

    // 清空表单
    registerData.value = { email: '', username: '', password: '' };
    confirmPassword.value = '';

    showSuccess('注册成功！');
  } catch {
    // 错误已经在 useAuth 中处理
  }
}

// 处理登出
async function handleLogout() {
  try {
    clearError();
    await logout();
    showSuccess('已退出登录');
  } catch {
    // 错误已经在 useAuth 中处理
  }
}

// 保存图形设置
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

// 显示成功消息
function showSuccess(message: string) {
  successMessage.value = message;
  successSnackbar.value = true;
}
</script>

<style scoped>
.settings-page {
  padding-top: 2rem;
}
</style>
