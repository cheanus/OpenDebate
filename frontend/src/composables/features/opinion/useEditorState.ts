import { ref } from 'vue';

/**
 * 编辑器状态管理
 */
export function useEditorState() {
  // 观点编辑器状态
  const showOpinionEditor = ref(false);
  const isEditingOpinion = ref(false);

  // 连接编辑器状态
  const showLinkEditor = ref(false);
  const isEditingLink = ref(false);

  // 打开观点编辑器
  const openOpinionEditor = (isEdit = false) => {
    isEditingOpinion.value = isEdit;
    showOpinionEditor.value = true;
  };

  // 关闭观点编辑器
  const closeOpinionEditor = () => {
    showOpinionEditor.value = false;
    isEditingOpinion.value = false;
  };

  // 打开连接编辑器
  const openLinkEditor = (isEdit = false) => {
    isEditingLink.value = isEdit;
    showLinkEditor.value = true;
  };

  // 关闭连接编辑器
  const closeLinkEditor = () => {
    showLinkEditor.value = false;
    isEditingLink.value = false;
  };

  return {
    // 状态
    showOpinionEditor,
    isEditingOpinion,
    showLinkEditor,
    isEditingLink,

    // 方法
    openOpinionEditor,
    closeOpinionEditor,
    openLinkEditor,
    closeLinkEditor,
  };
}
