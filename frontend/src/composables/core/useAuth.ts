import { ref, computed } from 'vue';
import { authService } from '@/services/auth';
import type { LoginForm, RegisterRequestData } from '@/services/auth';

export const ROLELEVEL = {
  admin: 2,
  user: 1,
  guest: 0,
};

export const useAuth = () => {
  const isLogined = ref(false);
  const email = ref<string | null>(null);
  const username = ref<string | null>(null);
  const role = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // 清除错误信息
  const clearError = () => {
    error.value = null;
  };

  // 权限级别
  const roleLevel = computed(() => {
    switch (role.value) {
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
      email.value = null;
      username.value = null;
      role.value = null;
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

      const userInfo = await authService.gettUserMe();

      // 更新状态
      isLogined.value = true;
      email.value = userInfo.email;
      username.value = userInfo.username;
      role.value = userInfo.role;

      return userInfo;
    } catch (err) {
      // 如果获取用户信息失败，可能是未登录状态
      isLogined.value = false;
      email.value = null;
      username.value = null;
      role.value = null;

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

  return {
    // 状态
    isLogined,
    email,
    username,
    role,
    roleLevel,
    isLoading,
    error,

    // 方法
    login,
    logout,
    fetchUserInfo,
    register,
    clearError,
  };
};
