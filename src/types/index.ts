export interface WikiArticle {
  title: string;
  extract: string;
  fullText?: string;
  thumbnail?: string;
  url: string;
}

export interface WikiLink {
  title: string;
  score: number;
}

export interface GraphNode {
  id: string;
  label: string;
  data: WikiArticle;
  depth: number;
  expansionCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  score?: number;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;
  rootNode: string | null;
  history: string[];
  isLoading: boolean;
}