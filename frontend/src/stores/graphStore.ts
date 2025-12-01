import { create } from 'zustand';
import type { GraphState, GraphNode, GraphEdge, SavedGraph } from '../types';

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
  incrementExpansionCount: (nodeId: string) => void;
  
  exportGraphToJSON: (name: string) => void;
  importGraphFromJSON: (savedGraph: SavedGraph) => void;
  getGraphMetadata: () => SavedGraph['metadata'];

  graphicsQuality: 'high' | 'low';
  setGraphicsQuality: (quality: 'high' | 'low') => void;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  rootNode: null,
  history: [],
  isLoading: false,
  graphicsQuality: 'high', // Default to pretty

  setGraphicsQuality: (quality) => set({ graphicsQuality: quality }),
  
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
  
  // NEW: Export graph to JSON file
  exportGraphToJSON: (name: string) => {
    const state = get();
    
    const maxDepth = state.nodes.length > 0 
      ? Math.max(...state.nodes.map(n => n.depth))
      : 0;
    
    const savedGraph: SavedGraph = {
      version: '1.0.0',
      timestamp: Date.now(),
      name: name || 'Untitled Graph',
      rootNode: state.rootNode,
      nodes: state.nodes,
      edges: state.edges,
      metadata: {
        totalNodes: state.nodes.length,
        totalEdges: state.edges.length,
        maxDepth: maxDepth,
        createdAt: new Date().toISOString(),
      }
    };
    
    // Create blob and download
    const blob = new Blob([JSON.stringify(savedGraph, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wikiExplorer_${name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  // NEW: Import graph from JSON
  importGraphFromJSON: (savedGraph: SavedGraph) => {
    // Validate version compatibility
    if (!savedGraph.version || savedGraph.version.split('.')[0] !== '1') {
      throw new Error('Incompatible graph version');
    }
    
    // Validate required fields
    if (!savedGraph.nodes || !savedGraph.edges) {
      throw new Error('Invalid graph data');
    }
    
    set({
      nodes: savedGraph.nodes,
      edges: savedGraph.edges,
      rootNode: savedGraph.rootNode,
      selectedNode: null,
      history: [],
      isLoading: false,
    });
  },
  
  // NEW: Get current graph metadata
  getGraphMetadata: () => {
    const state = get();
    const maxDepth = state.nodes.length > 0 
      ? Math.max(...state.nodes.map(n => n.depth))
      : 0;
    
    return {
      totalNodes: state.nodes.length,
      totalEdges: state.edges.length,
      maxDepth: maxDepth,
      createdAt: new Date().toISOString(),
    };
  },
}));