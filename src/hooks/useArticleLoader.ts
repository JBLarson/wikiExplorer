import { useCallback } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { fetchArticleSummary, fetchArticleLinks } from '../lib/wikipedia';
import { calculateEdgeDistance, normalizeNodeId } from '../services/graphCalculations';
import { linkCache } from '../services/linkCache';

export function useArticleLoader() {
  const {
    nodes,
    addNode,
    addEdge,
    setSelectedNode,
    addToHistory,
    setRootNode,
    setLoading,
    incrementExpansionCount,
  } = useGraphStore();

  const loadArticle = useCallback(async (
    title: string,
    depth: number = 0,
    onError: (error: string) => void
  ) => {
    setLoading(true);
    
    const nodeId = normalizeNodeId(title);
    const existingNodeLabels = nodes.map(n => n.label);
    const existingNodeIds = nodes.map(n => n.id);

    try {
      const article = await fetchArticleSummary(title);

      addNode({
        id: nodeId,
        label: article.title,
        data: article,
        depth,
        expansionCount: 0,
      });

      setSelectedNode(nodeId);
      addToHistory(nodeId);

      if (nodes.length === 0) {
        setRootNode(nodeId);
      }

      // Fetch 28 links from backend
      const { links, crossEdges } = await fetchArticleLinks(
        article.title,
        existingNodeLabels,
        existingNodeIds,
        28
      );

      console.log('📊 Root node links for:', article.title);
      links.slice(0, 7).forEach(link => {
        console.log(`  - ${link.title}: score=${link.score}, distance=${calculateEdgeDistance(link.score)}`);
      });

      // Use first 7 links, cache the rest
      const linksToDisplay = links.slice(0, 7);
      const linksToCache = links.slice(7);

      // Cache remaining 21 links (3 batches of 7)
      linkCache.set(nodeId, {
        links: linksToCache,
        crossEdges: crossEdges,
      });

      // STEP 1: Add all child nodes first
      linksToDisplay.forEach(link => {
        const linkNodeId = normalizeNodeId(link.title);
        
        addNode({
          id: linkNodeId,
          label: link.title,
          data: {
            title: link.title,
            extract: '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link.title.replace(/ /g, '_'))}`,
          },
          depth: depth + 1,
          expansionCount: 0,
        });
      });

      // STEP 2: Wait a tick, then add edges
      setTimeout(() => {
        const currentNodes = useGraphStore.getState().nodes;
        const currentEdges = useGraphStore.getState().edges;

        // Add edges from parent to children
        linksToDisplay.forEach(link => {
          const linkNodeId = normalizeNodeId(link.title);
          
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

        // Add cross edges
        if (crossEdges && crossEdges.length > 0) {
          crossEdges.forEach(edge => {
            const sourceId = normalizeNodeId(edge.source);
            const targetId = normalizeNodeId(edge.target);
            
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

        // Increment expansion count
        incrementExpansionCount(nodeId);
      }, 50);

    } catch (error) {
      console.error('Error loading article:', error);
      onError(error instanceof Error ? error.message : 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setSelectedNode, addToHistory, setRootNode, setLoading, incrementExpansionCount]);

  return { loadArticle };
}