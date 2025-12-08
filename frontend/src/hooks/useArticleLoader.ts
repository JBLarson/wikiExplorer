import { useCallback } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { fetchArticleSummary, fetchArticleLinks } from '../lib/wikipedia';
import { calculateEdgeDistance, normalizeNodeId } from '../services/graphCalculations';
import { linkCache } from '../services/linkCache';

export function useArticleLoader() {
  const {
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
    onError: (error: string) => void,
    isPrivate: boolean = false
  ) => {
    setLoading(true);
    
    const nodeId = normalizeNodeId(title);
    
    // Use getState() for accuracy
    const currentNodes = useGraphStore.getState().nodes;
    const existingNodeLabels = currentNodes.map(n => n.label);
    
    // Send IDs instead of Labels
    const allGraphNodeIds = currentNodes.map(n => n.id);

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

      if (currentNodes.length === 0) {
        setRootNode(nodeId);
      }

      // Fetch links with Global Context (IDs)
      const { links, crossEdges } = await fetchArticleLinks(
        article.title,
        existingNodeLabels,
        allGraphNodeIds, 
        // UPDATED: Standardized to 60 (was 49)
        60,
        isPrivate
      );

      // UPDATED: Standardized to 20 (was 7)
      const linksToDisplay = links.slice(0, 20);
      const linksToCache = links.slice(20);

      linkCache.set(nodeId, {
        links: linksToCache,
        crossEdges: crossEdges,
      });

      // Add Child Nodes
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

      // Add Edges
      setTimeout(() => {
        const latestNodes = useGraphStore.getState().nodes;
        const latestEdges = useGraphStore.getState().edges;

        linksToDisplay.forEach(link => {
          const linkNodeId = normalizeNodeId(link.title);
          
          if (latestNodes.some(n => n.id === nodeId) && latestNodes.some(n => n.id === linkNodeId)) {
            const edgeId = `${nodeId}-${linkNodeId}`;
            if (!latestEdges.some(e => e.id === edgeId)) {
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

        if (crossEdges && crossEdges.length > 0) {
          crossEdges.forEach(edge => {
            const sourceId = normalizeNodeId(edge.source);
            const targetId = normalizeNodeId(edge.target);
            
            if (latestNodes.some(n => n.id === sourceId) && latestNodes.some(n => n.id === targetId)) {
              const edgeId = `cross-${sourceId}-${targetId}`;
              const reverseId = `cross-${targetId}-${sourceId}`;
              
              if (!latestEdges.some(e => e.id === edgeId || e.id === reverseId)) {
                addEdge({
                  id: edgeId,
                  source: sourceId,
                  target: targetId,
                  score: edge.score,
                  distance: calculateEdgeDistance(edge.score),
                  strength: calculateEdgeDistance(edge.score)
                });
              }
            }
          });
        }

        incrementExpansionCount(nodeId);
      }, 50);

    } catch (error) {
      console.error('Error loading article:', error);
      onError(error instanceof Error ? error.message : 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  }, [addNode, addEdge, setSelectedNode, addToHistory, setRootNode, setLoading, incrementExpansionCount]);

  return { loadArticle };
}