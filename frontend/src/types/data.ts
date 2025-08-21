type LogicType = 'and' | 'or';
type LinkType = 'supports' | 'opposes';

export interface Debate {
  created_at: number;
  creator: string;
  description: string;
  id: string;
  title: string;
}

export interface Node {
  content: string;
  created_at: number;
  creator: string;
  has_more_children: boolean;
  id: string;
  label: string;
  logic_type: LogicType;
  negative_score: number | null;
  node_type: string;
  positive_score: number | null;
  relationship: {
    supports: Array<string>;
    opposes: Array<string>;
    supported_by: Array<string>;
    opposed_by: Array<string>;
  };
  score: {
    positive: number | null;
    negative: number | null;
  };
}

export interface Link {
  id: string;
  link_type: LinkType;
  source: string;
  target: string;
}

export type Element =
  | {
      data: Node;
      classes: 'or-node' | 'and-node';
    }
  | {
      data: Link;
    };

export interface Edge {
  from_id: string;
  id: string;
  is_success: boolean;
  link_type: LinkType;
  msg: null;
  to_id: string;
}

export interface OpinionFormData {
  logic_type: LogicType;
  content: string;
  parent_id: string;
  son_ids: Array<string>;
  link_type: LinkType;
  positive_score: number | null;
  is_llm_score: boolean;
  creator: string;
}

export interface LinkFormData {
  from_id: string;
  to_id: string;
  link_type: LinkType;
}
