import { apiClient } from './api';
import type { 
  ApiResponse,
  LinkType,
  Edge
} from '@/types';

export interface LinkCreateData {
  from_id: string;
  to_id: string;
  link_type: LinkType;
}

export interface LinkUpdateData {
  id: string;
  link_type?: LinkType;
}

export interface LinkDeleteData {
  id: string;
}

export interface LinkAttackData {
  link_id: string;
  debate_id?: string;
}

export class LinkService {
  async create(data: LinkCreateData): Promise<ApiResponse<{ id: string }>> {
    return apiClient.post('/link/create', data);
  }

  async delete(data: LinkDeleteData): Promise<ApiResponse<void>> {
    return apiClient.post('/link/delete', data);
  }

  async getInfo(linkId: string): Promise<ApiResponse<Edge>> {
    const params = { link_id: linkId };
    return apiClient.get('/link/info', params);
  }

  async update(data: LinkUpdateData): Promise<ApiResponse<void>> {
    return apiClient.post('/link/patch', data);
  }

  async attack(data: LinkAttackData): Promise<ApiResponse<{ or_id: string; and_id: string }>> {
    return apiClient.post('/link/attack', data);
  }
}

export const linkService = new LinkService();
