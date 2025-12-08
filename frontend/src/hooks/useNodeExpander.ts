import { useCallback } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { fetchArticleLinks } from '../lib/wikipedia';
import { calculateEdgeDistance, normalizeNodeId } from '../services/graphCalculations';
import { linkCache } from '../services/linkCache';
import type { WikiLink } from '../types';

export function useNodeExpander() {
  const {
    addNode,
    addEdge,
    setLoading,
    incrementExpansionCount,
  } = useGraphStore();

  const expandNode = useCallback(async (
    nodeId: string,
    onError: (error: string) => void
  ) => {
    // 1. Get FRESH state immediately
    const state = useGraphStore.getState();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setLoading(true);

    try {
      const cache = linkCache.get(nodeId);
      let linksToAdd: WikiLink[] = [];
      let crossEdgesToAdd: any[] = [];

      if (cache && cache.links.length > 0) {
        // Use cached links
        // UPDATED: Corrected hardcoded value from 50 to 20 to match intent
        linksToAdd = cache.links.slice(0, 20);
        const remainingLinks = cache.links.slice(20);

        linkCache.set(nodeId, {
          links: remainingLinks,
          crossEdges: cache.crossEdges,
        });

        crossEdgesToAdd = cache.crossEdges;
        console.log(`✓ Used cached links for ${node.label}`);

      } else {
        console.log(`🔍 Fetching new batch for ${node.label} with GLOBAL context...`);

        // 2. Extract GLOBAL context (All nodes currently in graph)
        const allNodes = useGraphStore.getState().nodes;
        const existingNodeLabels = allNodes.map(n => n.label);
        
        // FIX: Send IDs (not Titles)
        const allGraphNodeIds = allNodes.map(n => n.id);

        const { links, crossEdges } = await fetchArticleLinks(
          node.label,
          existingNodeLabels,
          allGraphNodeIds,
          // UPDATED: Request 60 nodes.
          // This allows for 1 immediate display of 20 + 2 future cached expansions of 20.
          60 
        );

        if (links.length === 0) {
          onError(`No more related articles found for "${node.label}"`);
          setLoading(false);
          return;
        }

        // UPDATED: Slice 20 for display instead of 7
        linksToAdd = links.slice(0, 20);
        const linksToCache = links.slice(20);

        linkCache.set(nodeId, {
          links: linksToCache,
          crossEdges: crossEdges,
        });

        crossEdgesToAdd = crossEdges;
      }

      // Filter duplicates
      const currentNodes = useGraphStore.getState().nodes; // Fresh check
      const nodesToAdd = linksToAdd.filter(link => {
        const linkNodeId = normalizeNodeId(link.title);
        return !currentNodes.some(n => n.id === linkNodeId);
      });

      // ADD NODES
      nodesToAdd.forEach(link => {
        const linkNodeId = normalizeNodeId(link.title);
        addNode({
          id: linkNodeId,
          label: link.title,
          data: {
            title: link.title,
            extract: '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link.title.replace(/ /g, '_'))}`,
          },
          depth: node.depth + 1,
          expansionCount: 0,
        });
      });

      // ADD EDGES (Async)
      setTimeout(() => {
        const latestNodes = useGraphStore.getState().nodes;
        const latestEdges = useGraphStore.getState().edges;

        // Parent -> Child edges
        nodesToAdd.forEach(link => {
          const linkNodeId = normalizeNodeId(link.title);
          
          const sourceExists = latestNodes.some(n => n.id === nodeId);
          const targetExists = latestNodes.some(n => n.id === linkNodeId);
          
          if (sourceExists && targetExists) {
            const edgeId = `${nodeId}-${linkNodeId}`;
            if (!latestEdges.some(e => e.id === edgeId)) {
              addEdge({
                id: edgeId,
                source: nodeId,
                target: linkNodeId,
                score: link.score,
                distance: calculateEdgeDistance(link.score),
                strength: calculateEdgeDistance(link.score)
              });
            }
          }
        });

        // Smart Cross Edges
        if (crossEdgesToAdd && crossEdgesToAdd.length > 0) {
          crossEdgesToAdd.forEach(edge => {
            const sourceId = normalizeNodeId(edge.source);
            const targetId = normalizeNodeId(edge.target);
            
            const sourceExists = latestNodes.some(n => n.id === sourceId);
            const targetExists = latestNodes.some(n => n.id === targetId);
            
            if (sourceExists && targetExists) {
              const edgeId = `cross-${sourceId}-${targetId}`;
              const reverseId = `cross-${targetId}-${sourceId}`;
              
              if (!latestEdges.some(e => e.id === edgeId || e.id === reverseId)) {
                addEdge({
                  id: edgeId,
                  source: sourceId,
                  target: targetId,
                  score: edge.score,
                  distance: calculateEdgeDistance(edge.score)
                });
              }
            }
          });
        }

        incrementExpansionCount(nodeId);
      }, 50);

    } catch (error) {
      console.error('Error expanding node:', error);
      onError(error instanceof Error ? error.message : 'Failed to expand node.');
    } finally {
      setLoading(false);
    }
  }, [addNode, addEdge, setLoading, incrementExpansionCount]);

  return { expandNode };
}