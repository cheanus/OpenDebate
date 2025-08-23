// Re-export all types
export * from './data';

// 分页参数类型
export interface PaginationParams {
  page?: number;
  size?: number;
}

// 分页响应类型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// 表单验证类型
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
}

export interface ValidationErrors {
  [key: string]: string;
}

// 组件 Props 通用类型
export interface BaseProps {
  class?: string;
  style?: string | Record<string, any>;
}

// 事件处理函数类型
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// 状态类型
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 错误类型
export interface ApiError {
  message: string;
  code?: string | number;
  details?: any;
}

// 设置类型
export interface AppSettings {
  maxUpdatedSon: number;
  numClickUpdatedSon: number;
  creator: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

// 图形布局选项
export interface GraphLayoutOptions {
  name: string;
  fit?: boolean;
  padding?: number;
  [key: string]: any;
}
