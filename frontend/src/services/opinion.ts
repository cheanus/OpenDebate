import { apiClient } from './api';
import type { Node, ApiResponse, LogicType, LinkType, UpdatedNodes } from '@/types';

export interface OpinionCreateOrData {
  content: string;
  positive_score?: number | null;
  logic_type?: LogicType;
  is_llm_score?: boolean;
  creator: string;
  debate_id: string;
}

export interface OpinionCreateAndData {
  parent_id: string;
  son_ids: string[];
  link_type: LinkType;
  creator: string;
  host?: string;
  debate_id: string;
  loaded_ids: string[];
}

export interface OpinionUpdateData {
  id: string;
  content?: string;
  score?: {
    positive?: number | null;
  };
  is_llm_score?: boolean;
  creator?: string;
  loaded_ids: string[];
}

export interface OpinionQueryParams {
  q?: string;
  debate_id?: string;
  min_score?: number;
  max_score?: number;
  is_time_accending?: boolean;
  max_num?: number;
}

export interface OpinionHeadParams {
  debate_id: string;
  is_root: boolean;
}

export interface OpinionDeleteData {
  opinion_id: string;
  debate_id: string;
  loaded_ids: string[];
}

export class OpinionService {
  async createOr(data: OpinionCreateOrData): Promise<ApiResponse<{ node_id: string }>> {
    return apiClient.post('/opinion/create_or', data);
  }

  async createAnd(
    data: OpinionCreateAndData,
  ): Promise<ApiResponse<{ node_id: string; link_ids: string[]; updated_nodes: UpdatedNodes }>> {
    return apiClient.post('/opinion/create_and', data);
  }

  async delete(data: OpinionDeleteData): Promise<ApiResponse<{ updated_nodes: UpdatedNodes }>> {
    return apiClient.post('/opinion/delete', data);
  }

  async getInfo(opinionId: string, debateId?: string): Promise<ApiResponse<Node>> {
    const params: Record<string, string> = { opinion_id: opinionId };
    if (debateId) {
      params.debate_id = debateId;
    }
    return apiClient.get('/opinion/info', params);
  }

  async query(params: OpinionQueryParams): Promise<ApiResponse<Node[]>> {
    const queryParams: Record<string, string> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams[key] = String(value);
      }
    });

    return apiClient.get('/opinion/query', queryParams);
  }

  async getHeads(params: OpinionHeadParams): Promise<ApiResponse<string[]>> {
    return apiClient.post('/opinion/head', params);
  }

  async update(data: OpinionUpdateData): Promise<ApiResponse<{ updated_nodes: UpdatedNodes }>> {
    return apiClient.post('/opinion/patch', data);
  }
}

export const opinionService = new OpinionService();
