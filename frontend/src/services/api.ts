import type { ApiResponse } from '@/types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const raw = await response.json();

      // 当后端返回格式不统一时（有时把业务字段直接放在顶层，而不是在 `data` 内），
      // 我们需要归一化：如果 is_success 为 true 且没有 data 字段，但存在其他业务字段，
      // 则把这些业务字段作为 `data` 返回，方便上层代码直接读取 `resp.id` 或 `resp.data`。
      const data = raw as Record<string, unknown>;

      if (!response.ok) {
        throw new ApiError(
          (data && (data.msg as string)) || `HTTP error! status: ${response.status}`,
          response.status,
          response,
        );
      }

      // 如果后端明确返回了 data 字段，直接返回；否则当 is_success 为 true 时，把除 is_success/msg 外的字段作为 data
      if (data && data.is_success) {
        if (Object.prototype.hasOwnProperty.call(data, 'data')) {
          return data as unknown as ApiResponse<T>;
        }

        // 组装一个带 data 的响应
        const { is_success, msg, ...rest } = data;
        const normalized: ApiResponse<T> = {
          is_success: Boolean(is_success),
          msg: typeof msg === 'string' ? msg : undefined,
          data: (Object.keys(rest).length > 0 ? (rest as unknown as T) : (undefined as unknown as T)),
        };
        // 将原始字段也保留下来
        Object.assign(normalized, rest);
        return normalized;
      }

      return data as unknown as ApiResponse<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
