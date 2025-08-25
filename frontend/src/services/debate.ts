import { apiClient } from './api';
import type { Debate, ApiResponse } from '@/types';

export interface DebateCreateData {
  title: string;
  description: string;
  creator: string;
}

export interface DebateUpdateData {
  id: string;
  title?: string;
  description?: string;
  creator?: string;
}

export interface DebateQueryParams {
  title?: string;
  description?: string;
  creator?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  debate_id?: string;
}

export interface DebateCiteData {
  debate_id: string;
  opinion_id: string;
}

export class DebateService {
  async create(data: DebateCreateData): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post('/debate/create', data);
  }

  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.post('/debate/delete', { id });
  }

  async query(params: DebateQueryParams = {}): Promise<ApiResponse<Debate[]>> {
    const queryParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams[key] = String(value);
      }
    });

    return apiClient.get('/debate/query', queryParams);
  }

  async update(data: DebateUpdateData): Promise<ApiResponse<void>> {
    return apiClient.post('/debate/patch', data);
  }

  async cite(data: DebateCiteData): Promise<ApiResponse<void>> {
    return apiClient.post('/debate/cite', data);
  }
}

export const debateService = new DebateService();
