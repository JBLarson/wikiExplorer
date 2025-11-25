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
  const { nodes, clearGraph } = useGraphStore();

  const handleHardRefresh = useCallback(() => {
    // 1. Clear React Query cache
    queryClient.clear();
    
    // 2. Clear app state
    clearGraph();
    linkCache.clear();
    setModalArticle(null);
    setError(null);
    
    // 3. Clear service workers if present
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
    
    // 4. Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    
    // 5. Force reload with cache busting
    const url = new URL(window.location.href);
    url.searchParams.set('_t', Date.now().toString());
    window.location.href = url.toString();
  }, [clearGraph, queryClient, setModalArticle, setError]);

  const handleRefreshEdges = useCallback(async () => {
    if (nodes.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Starting edge refresh cycle...');
      
      // STEP 1: Save current graph state to memory
      console.log('Step 1/3: Saving current graph state...');
      const currentState = useGraphStore.getState();
      const maxDepth = nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0;
      
      const tempSavedGraph: SavedGraph = {
        version: '1.0.0',
        timestamp: Date.now(),
        name: 'temp_refresh',
        rootNode: currentState.rootNode,
        nodes: currentState.nodes,
        edges: currentState.edges,
        metadata: {
          totalNodes: currentState.nodes.length,
          totalEdges: currentState.edges.length,
          maxDepth: maxDepth,
          createdAt: new Date().toISOString(),
        }
      };
      
      console.log(`✓ Saved graph: ${tempSavedGraph.nodes.length} nodes, ${tempSavedGraph.edges.length} edges`);
      
      // STEP 2: Complete teardown
      console.log('Step 2/3: Clearing everything...');
      
      // Clear React Query cache
      queryClient.clear();
      
      // Clear graph state completely
      clearGraph();
      
      // Clear link cache
      linkCache.clear();
      
      // Close any open modals
      setModalArticle(null);
      
      // STEP 3: Wait a tick for DOM to clear, then reload
      console.log('Step 3/3: Reloading graph...');
      
      // Use a longer delay to ensure Three.js cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Import the saved graph
      useGraphStore.getState().importGraphFromJSON(tempSavedGraph);
      
      console.log('✓ Graph reloaded successfully');
      
    } catch (error) {
      console.error('❌ Error refreshing edges:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh edges');
    } finally {
      setLoading(false);
    }
  }, [nodes, clearGraph, setLoading, queryClient, setModalArticle, setError]);

  return { handleHardRefresh, handleRefreshEdges };
}