import { ref, reactive } from 'vue';
import type { Node, OpinionFormData, LogicType, LinkType } from '@/types';

export function useOpinionForm() {
  const submitting = ref(false);

  const form = reactive<OpinionFormData>({
    logic_type: 'or' as LogicType,
    content: '',
    parent_id: '',
    son_ids: [],
    link_type: 'supports' as LinkType,
    positive_score: null,
    creator: '',
    is_llm_score: false,
  });

  const formErrors = reactive<Record<string, string[]>>({
    content: [],
    parent_id: [],
    son_ids: [],
    creator: [],
  });

  // 初始化表单（编辑模式）
  const initializeForm = (opinion: Node) => {
    form.logic_type = opinion.logic_type;
    form.content = opinion.content;
    form.positive_score = opinion.score?.positive || null;
    form.creator = opinion.creator;
    form.id = opinion.id;
    form.is_llm_score = false;

    // 清空错误
    clearErrors();
  };

  // 重置表单
  const resetForm = () => {
    form.logic_type = 'or';
    form.content = '';
    form.parent_id = '';
    form.son_ids = [];
    form.link_type = 'supports';
    form.positive_score = null;
    form.creator = '';
    form.id = undefined;
    form.is_llm_score = false;

    clearErrors();
  };

  // 清空错误
  const clearErrors = () => {
    Object.keys(formErrors).forEach((key) => {
      formErrors[key] = [];
    });
  };

  // 表单验证
  const validateForm = (): boolean => {
    clearErrors();
    let isValid = true;

    // 创建者必填
    if (!form.creator.trim()) {
      formErrors.creator = ['请输入创建者名称'];
      isValid = false;
    }

    if (form.logic_type === 'or') {
      // 或观点：内容必填
      if (!form.content.trim()) {
        formErrors.content = ['请输入观点内容'];
        isValid = false;
      }
    } else if (form.logic_type === 'and') {
      // 与观点：父节点和子节点必选
      if (!form.parent_id) {
        formErrors.parent_id = ['请选择父观点'];
        isValid = false;
      }
      if (!form.son_ids.length) {
        formErrors.son_ids = ['请选择至少一个子观点'];
        isValid = false;
      }
    }

    return isValid;
  };

  return {
    form,
    formErrors,
    submitting,
    initializeForm,
    resetForm,
    validateForm,
    clearErrors,
  };
}
