export interface WikiArticle {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
}

export interface WikiLink {
  title: string;
  score: number; // 0-100 from your backend
}

export interface GraphNode {
  id: string;
  label: string;
  data: WikiArticle;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  history: string[];
}