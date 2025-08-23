import { ref } from 'vue';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// 全局通知列表
const notifications = ref<Notification[]>([]);

let notificationIdCounter = 0;

export function useNotifications() {
  const addNotification = (
    message: string,
    type: Notification['type'] = 'info',
    duration = 4000
  ): string => {
    const id = `notification-${++notificationIdCounter}`;
    
    const notification: Notification = {
      id,
      message,
      type,
      duration,
    };
    
    notifications.value.push(notification);
    
    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };

  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const clearNotifications = () => {
    notifications.value = [];
  };

  // 便捷方法
  const notifySuccess = (message: string, duration?: number) => 
    addNotification(message, 'success', duration);

  const notifyError = (message: string, duration?: number) => 
    addNotification(message, 'error', duration);

  const notifyWarning = (message: string, duration?: number) => 
    addNotification(message, 'warning', duration);

  const notifyInfo = (message: string, duration?: number) => 
    addNotification(message, 'info', duration);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  };
}
