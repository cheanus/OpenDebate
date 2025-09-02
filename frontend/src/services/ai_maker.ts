import { apiClient } from './api';
import type { ApiResponse } from '@/types';

export interface AiDebateCreateData {
  content: string;
}

export class DebateService {
  async create(data: AiDebateCreateData): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post('/ai/create_debate', data);
  }
}

export const aiDebateService = new DebateService();
