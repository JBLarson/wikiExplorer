// frontend/src/stores/graphStore.ts

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
  
  // NEW: Prune functionality
  pruneGraph: (newRootId: string) => void;

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
  graphicsQuality: 'high',

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
  
  // --- NEW: Prune Graph Logic ---
  pruneGraph: (newRootId: string) => {
    const state = get();
    const { nodes, edges } = state;

    // 1. Build Adjacency List for Traversal
    const adjacency = new Map<string, string[]>();
    edges.forEach(e => {
        // Only track forward edges for hierarchy (ignore cross edges for structural pruning if preferred, 
        // or keep them. Here we simply follow all edges to find descendants)
        if (!adjacency.has(e.source)) adjacency.set(e.source, []);
        adjacency.get(e.source)!.push(e.target);
    });

    // 2. Find all reachable nodes from the new root (BFS)
    const keptNodeIds = new Set<string>([newRootId]);
    const queue = [newRootId];
    
    // Also track new depth levels relative to the new root
    const newDepths = new Map<string, number>();
    newDepths.set(newRootId, 0);

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentDepth = newDepths.get(currentId)!;
        const neighbors = adjacency.get(currentId) || [];

        for (const neighborId of neighbors) {
            if (!keptNodeIds.has(neighborId)) {
                keptNodeIds.add(neighborId);
                newDepths.set(neighborId, currentDepth + 1);
                queue.push(neighborId);
            }
        }
    }

    // 3. Filter Nodes & Edges
    const finalNodes = nodes
        .filter(n => keptNodeIds.has(n.id))
        .map(n => ({
            ...n,
            // Update depth so visualization colors reset (New Root = Purple/Amber)
            depth: newDepths.has(n.id) ? newDepths.get(n.id)! : 0
        }));

    const finalEdges = edges.filter(e => 
        keptNodeIds.has(e.source) && keptNodeIds.has(e.target)
    );

    // 4. Update State
    set({
        nodes: finalNodes,
        edges: finalEdges,
        rootNode: newRootId,
        selectedNode: newRootId, // Select the new root
        history: state.history.filter(id => keptNodeIds.has(id)) // Keep relevant history
    });
  },

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
  
  importGraphFromJSON: (savedGraph: SavedGraph) => {
    if (!savedGraph.version || savedGraph.version.split('.')[0] !== '1') {
      throw new Error('Incompatible graph version');
    }
    
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