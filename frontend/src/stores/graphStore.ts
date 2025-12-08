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
  
  // --- REDESIGNED ACTIONS ---
  // Action 1: "Prune" (Delete this branch)
  pruneSubtree: (nodeId: string) => void;
  
  // Action 2: "Focus" (Make this the new root)
  setNewRoot: (nodeId: string) => void;

  exportGraphToJSON: (name: string) => void;
  importGraphFromJSON: (savedGraph: SavedGraph) => void;
  getGraphMetadata: () => SavedGraph['metadata'];

  graphicsQuality: 'high' | 'low';
  setGraphicsQuality: (quality: 'high' | 'low') => void;
}

// Helper: Garbage Collector
// Performs a BFS from the root to find all reachable nodes.
// Returns the clean lists of nodes and edges.
const runGarbageCollection = (
  rootId: string, 
  allNodes: GraphNode[], 
  allEdges: GraphEdge[]
) => {
  // 1. Build Adjacency List
  const adjacency = new Map<string, string[]>();
  allEdges.forEach(e => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    adjacency.get(e.source)!.push(e.target);
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

  // 3. Filter
  const finalNodes = allNodes
    .filter(n => reachableIds.has(n.id))
    .map(n => ({
      ...n,
      depth: newDepths.get(n.id) ?? n.depth // Update depth based on new path
    }));

  const finalEdges = allEdges.filter(e => 
    reachableIds.has(e.source) && reachableIds.has(e.target)
  );

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

  // --- NEW: Safe Pruning Logic ---

  /**
   * Action 1: Prune Subtree
   * Removes the target node. Then runs GC to remove any children that are 
   * no longer reachable from the main Root.
   */
  pruneSubtree: (nodeId: string) => {
    const state = get();
    if (!state.rootNode || nodeId === state.rootNode) {
      console.warn("Cannot prune the root node directly. Use 'Set Root' instead.");
      return;
    }

    // 1. Remove the explicit target node and its connected edges
    const nodesAfterDelete = state.nodes.filter(n => n.id !== nodeId);
    const edgesAfterDelete = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);

    // 2. Run Garbage Collection starting from the *current* Root
    const { finalNodes, finalEdges, reachableIds } = runGarbageCollection(
      state.rootNode, 
      nodesAfterDelete, 
      edgesAfterDelete
    );

    set({
      nodes: finalNodes,
      edges: finalEdges,
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
      history: state.history.filter(id => reachableIds.has(id))
    });
  },

  /**
   * Action 2: Set New Root (Focus)
   * Makes the target node the new Root. Removes all parents and siblings.
   * Keeps only the target and its descendants.
   */
  setNewRoot: (newRootId: string) => {
    const state = get();
    
    // 1. Run Garbage Collection starting from the *new* Root
    // This naturally discards all ancestors (since BFS flows downstream only)
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