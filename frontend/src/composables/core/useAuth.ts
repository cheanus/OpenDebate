import { ref, computed } from 'vue';
import { authService } from '@/services/auth';
import type { LoginForm, RegisterRequestData, RegisterResponse } from '@/services/auth';

export const ROLELEVEL = {
  admin: 2,
  user: 1,
  guest: 0,
};

// 全局状态，确保所有组件共享同一个状态
const globalIsLogined = ref(false);
const globalUserInfo = ref<RegisterResponse | null>(null);
const globalIsLoading = ref(false);
const globalError = ref<string | null>(null);

export const useAuth = () => {
  // 使用全局状态，而不是每次创建新的响应式状态
  const isLogined = globalIsLogined;
  const userInfo = globalUserInfo;
  const isLoading = globalIsLoading;
  const error = globalError;

  // 清除错误信息
  const clearError = () => {
    error.value = null;
  };

  // 权限级别
  const roleLevel = computed(() => {
    switch (userInfo.value?.role) {
      case 'admin':
        return ROLELEVEL.admin;
      case 'user':
        return ROLELEVEL.user;
      default:
        return ROLELEVEL.guest;
    }
  });

  // 登录函数
  const login = async (form: LoginForm) => {
    try {
      isLoading.value = true;
      clearError();

      await authService.login(form);
      // 登录成功后获取用户信息
      await fetchUserInfo();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 注销函数
  const logout = async () => {
    try {
      isLoading.value = true;
      clearError();

      await authService.logout();

      // 清除本地状态
      isLogined.value = false;
      userInfo.value = null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注销失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 获取用户信息
  const fetchUserInfo = async (isFirstLoad: boolean = false) => {
    try {
      isLoading.value = true;
      clearError();

      const user = await authService.gettUserMe();

      // 更新状态
      isLogined.value = true;
      userInfo.value = user;

      return user;
    } catch (err) {
      // 如果获取用户信息失败，可能是未登录状态
      isLogined.value = false;
      userInfo.value = null;

      if (!isFirstLoad) {
        error.value = err instanceof Error ? err.message : '获取用户信息失败';
        throw err;
      }
    } finally {
      isLoading.value = false;
    }
  };

  // 注册函数
  const register = async (form: RegisterRequestData) => {
    try {
      isLoading.value = true;
      clearError();

      const result = await authService.register(form);
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // 注册并自动登录函数
  const registerAndLogin = async (form: RegisterRequestData) => {
    try {
      isLoading.value = true;
      clearError();

      // 先注册
      await authService.register(form);

      // 注册成功后自动登录
      await authService.login({
        email: form.email,
        password: form.password,
      });

      // 获取用户信息
      await fetchUserInfo();

      return userInfo.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // 状态
    isLogined,
    userInfo,
    roleLevel,
    isLoading,
    error,

    // 方法
    login,
    logout,
    fetchUserInfo,
    register,
    registerAndLogin,
    clearError,
  };
};
