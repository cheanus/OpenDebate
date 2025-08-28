import { ref } from 'vue';
import { APP_CONFIG } from '@/config';

/**
 * 图形设置管理
 */
export function useGraphSettings() {
  // 设置
  const maxUpdatedSon = ref(APP_CONFIG.defaults.maxUpdatedSon);
  const numClickUpdatedSon = ref(APP_CONFIG.defaults.numClickUpdatedSon);
  const loadDepth = ref(APP_CONFIG.defaults.loadDepth);

  // 从localStorage加载设置
  const loadSettings = () => {
    try {
      const settings = localStorage.getItem('debate_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.maxUpdatedSon) maxUpdatedSon.value = parsed.maxUpdatedSon;
        if (parsed.numClickUpdatedSon) numClickUpdatedSon.value = parsed.numClickUpdatedSon;
        if (parsed.loadDepth) loadDepth.value = parsed.loadDepth;
      }
    } catch (error) {
      console.warn('加载设置失败:', error);
    }
  };

  // 保存设置到localStorage
  const saveSettings = () => {
    try {
      const settings = {
        maxUpdatedSon: maxUpdatedSon.value,
        numClickUpdatedSon: numClickUpdatedSon.value,
        loadDepth: loadDepth.value,
      };
      localStorage.setItem('debate_settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('保存设置失败:', error);
    }
  };

  // 重置设置为默认值
  const resetSettings = () => {
    maxUpdatedSon.value = APP_CONFIG.defaults.maxUpdatedSon;
    numClickUpdatedSon.value = APP_CONFIG.defaults.numClickUpdatedSon;
    loadDepth.value = APP_CONFIG.defaults.loadDepth;
    saveSettings();
  };

  return {
    // 设置
    maxUpdatedSon,
    numClickUpdatedSon,
    loadDepth,
    // 方法
    loadSettings,
    saveSettings,
    resetSettings,
  };
}
