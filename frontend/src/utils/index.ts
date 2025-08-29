import type { Node } from '@/types';

/**
 * 格式化时间戳为本地时间字符串
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getNodeSize(node: Node) {
  const nodeData = node.score;
  const pos = nodeData ? nodeData.positive : null;
  const neg = nodeData ? nodeData.negative : null;
  let avg = null;
  if (pos != null && neg != null) avg = (pos + neg) / 2;
  else if (pos != null) avg = pos;
  else if (neg != null) avg = neg;
  if (avg == null) return 60;
  return 60 + 120 * avg;
}

/**
 * 节点文本省略工具函数
 */
export function wrapLabelText(text: string, width: number, zoomFactor = 0.05): string {
  if (!text) return '';
  const scaledWidth = Math.floor(width * zoomFactor);
  if (scaledWidth < 1) return text;

  // 将文本每 scaledWidth 个字符分隔成一行
  const regex = new RegExp(`.{1,${scaledWidth}}`, 'g');
  const lines = text.match(regex) || [];

  // 以最大行数限制，当行数超过时，最后一行添加省略号
  const maxLines = 2;
  if (lines.length > maxLines) {
    lines[maxLines - 1] = lines[maxLines - 1] + '…';
    return lines.slice(0, maxLines).join('\n');
  }
  return lines.join('\n');
}

/**
 * 获取存储值
 */
export function getStorageValue<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`获取存储值失败: ${key}`, error);
    return defaultValue;
  }
}

/**
 * 设置存储值
 */
export function setStorageValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`设置存储值失败: ${key}`, error);
  }
}

/**
 * 截断文本
 */
export function truncateText(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}
