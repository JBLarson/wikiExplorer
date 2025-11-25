import { useCallback } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { fetchArticleLinks } from '../lib/wikipedia';
import { calculateEdgeDistance, normalizeNodeId } from '../services/graphCalculations';
import { linkCache } from '../services/linkCache';
import type { WikiLink } from '../types';

export function useNodeExpander() {
  const {
    nodes,
    addNode,
    addEdge,
    setLoading,
    incrementExpansionCount,
  } = useGraphStore();

  const expandNode = useCallback(async (
    nodeId: string,
    onError: (error: string) => void
  ) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setLoading(true);

    try {
      const cache = linkCache.get(nodeId);
      let linksToAdd: WikiLink[] = [];
      let crossEdgesToAdd: any[] = [];

      if (cache && cache.links.length > 0) {
        // Use cached links (next batch of 7)
        linksToAdd = cache.links.slice(0, 7);
        const remainingLinks = cache.links.slice(7);

        // Update cache
        linkCache.set(nodeId, {
          links: remainingLinks,
          crossEdges: cache.crossEdges,
        });

        crossEdgesToAdd = cache.crossEdges;
        console.log(`✓ Used cached links for ${node.label}. ${remainingLinks.length} links remaining in cache.`);

      } else {
        // No cache available - fetch new batch of 28 from backend
        console.log(`🔍 Cache empty for ${node.label}, fetching new batch from backend...`);

        const existingNodeLabels = nodes.map(n => n.label);
        const existingNodeIds = nodes.map(n => n.id);

        const { links, crossEdges } = await fetchArticleLinks(
          node.label,
          existingNodeLabels,
          existingNodeIds,
          28
        );

        if (links.length === 0) {
          onError(`No more related articles found for "${node.label}"`);
          setLoading(false);
          return;
        }

        // Use first 7, cache the rest
        linksToAdd = links.slice(0, 7);
        const linksToCache = links.slice(7);

        // Update cache with new links
        linkCache.set(nodeId, {
          links: linksToCache,
          crossEdges: crossEdges,
        });

        crossEdgesToAdd = crossEdges;
      }

      // Filter out nodes that already exist
      const nodesToAdd = linksToAdd.filter(link => {
        const linkNodeId = normalizeNodeId(link.title);
        return !nodes.some(n => n.id === linkNodeId);
      });

      // STEP 1: Add all nodes first
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

      // STEP 2: Wait a tick for nodes to be registered, then add edges
      setTimeout(() => {
        const currentNodes = useGraphStore.getState().nodes;
        const currentEdges = useGraphStore.getState().edges;

        // Add edges from parent to new children
        nodesToAdd.forEach(link => {
          const linkNodeId = normalizeNodeId(link.title);
          
          // Verify both nodes exist before adding edge
          const sourceExists = currentNodes.some(n => n.id === nodeId);
          const targetExists = currentNodes.some(n => n.id === linkNodeId);
          
          if (sourceExists && targetExists) {
            const edgeId = `${nodeId}-${linkNodeId}`;
            if (!currentEdges.some(e => e.id === edgeId)) {
              addEdge({
                id: edgeId,
                source: nodeId,
                target: linkNodeId,
                score: link.score,
                distance: calculateEdgeDistance(link.score)
              });
            }
          }
        });

        // Add cross edges (connections between existing nodes)
        if (crossEdgesToAdd && crossEdgesToAdd.length > 0) {
          crossEdgesToAdd.forEach(edge => {
            const sourceId = normalizeNodeId(edge.source);
            const targetId = normalizeNodeId(edge.target);
            
            // Verify both nodes exist before adding cross edge
            const sourceExists = currentNodes.some(n => n.id === sourceId);
            const targetExists = currentNodes.some(n => n.id === targetId);
            
            if (sourceExists && targetExists) {
              const edgeId = `cross-${sourceId}-${targetId}`;
              if (!currentEdges.some(e => e.id === edgeId)) {
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

        // Increment expansion count after everything is added
        incrementExpansionCount(nodeId);
      }, 50);

    } catch (error) {
      console.error('Error expanding node:', error);
      onError(error instanceof Error ? error.message : 'Failed to expand node.');
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setLoading, incrementExpansionCount]);

  return { expandNode };
}