import { useCallback } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { linkCache } from '../services/linkCache';
import type { SavedGraph } from '../types';

export function useGraphRefresh(
  queryClient: any,
  setModalArticle: (article: any) => void,
  setError: (error: string | null) => void,
  setLoading: (loading: boolean) => void
) {
  const { nodes, edges, rootNode, clearGraph, importGraphFromJSON } = useGraphStore();

  const handleHardRefresh = useCallback(() => {
    // 1. Clear React Query cache
    queryClient.clear();
    
    // 2. Clear app state
    clearGraph();
    linkCache.clear();
    setModalArticle(null);
    setError(null);
    
    // 3. Clear storage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    // 4. Force reload
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    window.location.href = url.toString();
  }, [clearGraph, queryClient, setModalArticle, setError]);

  const handleRefreshEdges = useCallback(async () => {
    if (nodes.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Regenerating graph connections...');
      
      // 1. Capture current state (Deep copy to avoid reference issues)
      const currentNodes = JSON.parse(JSON.stringify(nodes));
      const currentEdges = JSON.parse(JSON.stringify(edges));
      const currentRoot = rootNode;
      const maxDepth = nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0;

      // 2. Construct valid save object
      const tempSavedGraph: SavedGraph = {
        version: '1.0.0',
        timestamp: Date.now(),
        name: 'temp_refresh',
        rootNode: currentRoot,
        nodes: currentNodes,
        edges: currentEdges,
        metadata: {
          totalNodes: currentNodes.length,
          totalEdges: currentEdges.length,
          maxDepth: maxDepth,
          createdAt: new Date().toISOString(),
        }
      };
      
      // 3. FORCE RE-MOUNT
      // We don't just clear; we re-inject the data to force the physics engine 
      // (both 2D and 3D) to re-calculate links from scratch.
      
      // Briefly clear to unmount renderers (this resets physics state)
      clearGraph();
      
      // Immediate timeout to allow one React render cycle to process the "clear"
      // This is necessary to kill the old WebGL context/Sigma instance
      setTimeout(() => {
        importGraphFromJSON(tempSavedGraph);
        setLoading(false);
        console.log('Graph structure regenerated.');
      }, 50);
      
    } catch (error) {
      console.error('Error refreshing edges:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh edges');
      setLoading(false);
    }
  }, [nodes, edges, rootNode, clearGraph, importGraphFromJSON, setLoading, setError]);

  return { handleHardRefresh, handleRefreshEdges };
}