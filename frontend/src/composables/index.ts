/**
 * Composables 统一入口文件
 * 提供所有 composables 的导出，简化导入路径
 */

// 核心业务逻辑
export { useDebates } from './core/useDebates';
export { useNotifications } from './core/useNotifications';
export * from './core/useOpinionGraph';

// UI 交互逻辑
export { useContextMenu } from './ui/useContextMenu';

// 功能特性逻辑
export { useOpinionForm } from './features/opinion/useOpinionForm';
export { useEditorState } from './features/opinion/useEditorState';
export { useCRUDWrapper as useCRUDFixes } from './features/opinion/useCRUDFixes';
export { useDebateSearch } from './features/debate/useDebateSearch';
export { useNodeArrows } from './features/graph/useNodeArrows';
