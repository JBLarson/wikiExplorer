import { create } from 'zustand';
import type { GraphState, GraphNode, GraphEdge } from '../types';

interface GraphStore extends GraphState {
  addNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setRootNode: (nodeId: string) => void;
  addToHistory: (nodeId: string) => void;
  clearGraph: () => void;
  removeNode: (nodeId: string) => void;
  setLoading: (loading: boolean) => void;
  getNodeById: (nodeId: string) => GraphNode | undefined;
  getNodesByDepth: (depth: number) => GraphNode[];
  getConnectedNodes: (nodeId: string) => GraphNode[];
  incrementExpansionCount: (nodeId: string) => void;  // Add this
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  rootNode: null,
  history: [],
  isLoading: false,
  
  addNode: (node) =>
    set((state) => {
      if (state.nodes.some(n => n.id === node.id)) {
        return state;
      }
      return { nodes: [...state.nodes, node] };
    }),
  
  addEdge: (edge) =>
    set((state) => {
      if (state.edges.some(e => e.id === edge.id)) {
        return state;
      }
      return { edges: [...state.edges, edge] };
    }),
  
  setSelectedNode: (nodeId) =>
    set({ selectedNode: nodeId }),
  
  setRootNode: (nodeId) =>
    set({ rootNode: nodeId }),
  
  addToHistory: (nodeId) =>
    set((state) => ({
      history: [...state.history, nodeId],
    })),
  
  clearGraph: () =>
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
      rootNode: null,
      history: [],
      isLoading: false,
    }),
  
  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
    })),
  
  setLoading: (loading) =>
    set({ isLoading: loading }),
  
  incrementExpansionCount: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.map(n => 
        n.id === nodeId 
          ? { ...n, expansionCount: n.expansionCount + 1 }
          : n
      )
    })),
  
  getNodeById: (nodeId) => {
    return get().nodes.find(n => n.id === nodeId);
  },
  
  getNodesByDepth: (depth) => {
    return get().nodes.filter(n => n.depth === depth);
  },
  
  getConnectedNodes: (nodeId) => {
    const edges = get().edges.filter(e => e.source === nodeId || e.target === nodeId);
    const connectedIds = edges.map(e => e.source === nodeId ? e.target : e.source);
    return get().nodes.filter(n => connectedIds.includes(n.id));
  },
}));