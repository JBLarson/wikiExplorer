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
  
  // Pruning actions
  pruneSubtree: (nodeId: string) => void;
  setNewRoot: (nodeId: string) => void;

  exportGraphToJSON: (name: string) => void;
  importGraphFromJSON: (savedGraph: SavedGraph) => void;
  getGraphMetadata: () => SavedGraph['metadata'];

  graphicsQuality: 'high' | 'low';
  setGraphicsQuality: (quality: 'high' | 'low') => void;
}

// Helper: Garbage Collector
// Performs a BFS from the root to find all reachable nodes.
// SAFELY handles both string IDs and Object references (which D3 creates)
const runGarbageCollection = (
  rootId: string, 
  allNodes: GraphNode[], 
  allEdges: GraphEdge[]
) => {
  // 1. Build Adjacency List
  const adjacency = new Map<string, string[]>();
  
  allEdges.forEach(e => {
    // Defensive check: D3 might turn e.source into an object { id: "..." }
    const sId = typeof e.source === 'object' ? (e.source as any).id : e.source;
    const tId = typeof e.target === 'object' ? (e.target as any).id : e.target;

    if (!adjacency.has(sId)) adjacency.set(sId, []);
    adjacency.get(sId)!.push(tId);
  });

  // 2. BFS from Root
  const reachableIds = new Set<string>([rootId]);
  const queue = [rootId];
  const newDepths = new Map<string, number>();
  newDepths.set(rootId, 0);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = newDepths.get(currentId)!;
    const neighbors = adjacency.get(currentId) || [];

    for (const neighborId of neighbors) {
      if (!reachableIds.has(neighborId)) {
        reachableIds.add(neighborId);
        newDepths.set(neighborId, currentDepth + 1);
        queue.push(neighborId);
      }
    }
  }

  // 3. Filter Nodes
  const finalNodes = allNodes
    .filter(n => reachableIds.has(n.id))
    .map(n => ({
      ...n,
      depth: newDepths.get(n.id) ?? 0 // Reset depth based on new hierarchy
    }));

  // 4. Filter Edges
  const finalEdges = allEdges.filter(e => {
    const sId = typeof e.source === 'object' ? (e.source as any).id : e.source;
    const tId = typeof e.target === 'object' ? (e.target as any).id : e.target;
    return reachableIds.has(sId) && reachableIds.has(tId);
  });

  return { finalNodes, finalEdges, reachableIds };
};

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
      if (state.nodes.some(n => n.id === node.id)) return state;
      return { nodes: [...state.nodes, node] };
    }),
  
  addEdge: (edge) =>
    set((state) => {
      if (state.edges.some(e => e.id === edge.id)) return state;
      return { edges: [...state.edges, edge] };
    }),
  
  setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
  setRootNode: (nodeId) => set({ rootNode: nodeId }),
  addToHistory: (nodeId) => set((state) => ({ history: [...state.history, nodeId] })),
  
  clearGraph: () => set({
      nodes: [], edges: [], selectedNode: null, rootNode: null, history: [], isLoading: false,
  }),
  
  removeNode: (nodeId) => set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  incrementExpansionCount: (nodeId) => set((state) => ({
      nodes: state.nodes.map(n => n.id === nodeId ? { ...n, expansionCount: n.expansionCount + 1 } : n)
  })),

  // --- PRUNING LOGIC ---

  pruneSubtree: (nodeId: string) => {
    const state = get();
    if (!state.rootNode || nodeId === state.rootNode) {
      console.warn("Cannot prune the root node directly.");
      return;
    }

    // 1. Explicitly remove the target node
    const nodesAfterDelete = state.nodes.filter(n => n.id !== nodeId);
    // Note: We don't filter edges here; GC will catch orphans in the next step.

    // 2. Run Garbage Collection from the *current* Root
    // This finds everything still attached to the root and discards the rest (the pruned branch)
    const { finalNodes, finalEdges, reachableIds } = runGarbageCollection(
      state.rootNode, 
      nodesAfterDelete, 
      state.edges
    );

    set({
      nodes: finalNodes,
      edges: finalEdges,
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
      history: state.history.filter(id => reachableIds.has(id))
    });
  },

  setNewRoot: (newRootId: string) => {
    const state = get();
    
    // 1. Run Garbage Collection starting from the *new* Root
    // This naturally discards all ancestors (parents) and unrelated branches
    const { finalNodes, finalEdges, reachableIds } = runGarbageCollection(
      newRootId, 
      state.nodes, 
      state.edges
    );

    set({
      nodes: finalNodes,
      edges: finalEdges,
      rootNode: newRootId,
      selectedNode: newRootId,
      history: state.history.filter(id => reachableIds.has(id))
    });
  },

  getNodeById: (nodeId) => get().nodes.find(n => n.id === nodeId),
  getNodesByDepth: (depth) => get().nodes.filter(n => n.depth === depth),
  getConnectedNodes: (nodeId) => {
    const edges = get().edges.filter(e => e.source === nodeId || e.target === nodeId);
    const connectedIds = edges.map(e => e.source === nodeId ? e.target : e.source);
    return get().nodes.filter(n => connectedIds.includes(n.id));
  },
  
  exportGraphToJSON: (name: string) => {
    const state = get();
    const maxDepth = state.nodes.length > 0 ? Math.max(...state.nodes.map(n => n.depth)) : 0;
    
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
    
    const blob = new Blob([JSON.stringify(savedGraph, null, 2)], { type: 'application/json' });
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
    if (!savedGraph.version || savedGraph.version.split('.')[0] !== '1') throw new Error('Incompatible graph version');
    if (!savedGraph.nodes || !savedGraph.edges) throw new Error('Invalid graph data');
    
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
    const maxDepth = state.nodes.length > 0 ? Math.max(...state.nodes.map(n => n.depth)) : 0;
    return {
      totalNodes: state.nodes.length,
      totalEdges: state.edges.length,
      maxDepth: maxDepth,
      createdAt: new Date().toISOString(),
    };
  },
}));