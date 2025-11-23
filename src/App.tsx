import { useState, useCallback, useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphCanvas } from './components/GraphCanvas';
import { RefreshButton } from './components/RefreshButton';
import { SearchBar } from './components/SearchBar';
import { Counter } from './components/Counter';
import { ExploreModal } from './components/modals/Explore';
import { useGraphStore } from './stores/graphStore';
import { fetchArticleSummary, fetchArticleLinks, checkBackendHealth, fetchArticleFullText } from './lib/wikipedia';
import type { WikiArticle, WikiLink } from './types';
import weLogo from './assets/wikiExplorer-logo-300.png';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Cache structure to store unused links for each node
interface NodeLinkCache {
  links: WikiLink[];
  crossEdges: any[];
}

function AppContent() {
  const {
    nodes,
    addNode,
    addEdge,
    setSelectedNode,
    setRootNode,
    addToHistory,
    clearGraph,
    setLoading,
    isLoading,
    incrementExpansionCount,
  } = useGraphStore();

  const [modalArticle, setModalArticle] = useState<WikiArticle | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for storing unused links per node
  const linkCacheRef = useRef<Map<string, NodeLinkCache>>(new Map());

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);



    // Hard refresh handler
    const handleHardRefresh = useCallback(() => {
      // 1. Clear React Query cache
      queryClient.clear();
      
      // 2. Clear app state
      clearGraph();
      linkCacheRef.current.clear();
      setModalArticle(null);
      setError(null);
      
      // 3. Clear service workers if present
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.unregister());
        });
      }
      
      // 4. Clear sessionStorage and localStorage (be careful with this)
      try {
        sessionStorage.clear();
        // Only clear app-specific localStorage items if you have any
        // localStorage.clear(); // Uncomment if you want to clear all localStorage
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // 5. Force reload with cache busting
      const url = new URL(window.location.href);
      url.searchParams.set('_t', Date.now().toString());
      window.location.href = url.toString();
    }, [clearGraph]);




  // Initial load - fetch article and first batch of related links
  const loadArticle = useCallback(async (title: string, depth: number = 0) => {
    setLoading(true);
    setError(null);
    
    const nodeId = title.toLowerCase().replace(/\s+/g, '_');
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

      // Use first 7 links, cache the rest
      const linksToDisplay = links.slice(0, 7);
      const linksToCache = links.slice(7);

      // Cache remaining 21 links (3 batches of 7)
      linkCacheRef.current.set(nodeId, {
        links: linksToCache,
        crossEdges: crossEdges,
      });

      // STEP 1: Add all child nodes first
      linksToDisplay.forEach(link => {
        const linkNodeId = link.title.toLowerCase().replace(/\s+/g, '_');
        
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
          const linkNodeId = link.title.toLowerCase().replace(/\s+/g, '_');
          
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
              });
            }
          }
        });

        // Add cross edges
        if (crossEdges && crossEdges.length > 0) {
          crossEdges.forEach(edge => {
            const sourceId = edge.source.toLowerCase().replace(/\s+/g, '_');
            const targetId = edge.target.toLowerCase().replace(/\s+/g, '_');
            
            const sourceExists = currentNodes.some(n => n.id === sourceId);
            const targetExists = currentNodes.some(n => n.id === targetId);
            
            if (sourceExists && targetExists) {
              const edgeId = `cross-${sourceId}-${targetId}`;
              if (!currentEdges.some(e => e.id === edgeId)) {
                addEdge({
                  id: edgeId,
                  source: sourceId,
                  target: targetId,
                  score: edge.score
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
      setError(error instanceof Error ? error.message : 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setSelectedNode, addToHistory, setRootNode, setLoading, incrementExpansionCount]);








  // Expand existing node - use cache or fetch new links
  const expandNode = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setLoading(true);
    setError(null);

    try {
      const cache = linkCacheRef.current.get(nodeId);
      let linksToAdd: WikiLink[] = [];
      let crossEdgesToAdd: any[] = [];

      if (cache && cache.links.length > 0) {
        // Use cached links (next batch of 7)
        linksToAdd = cache.links.slice(0, 7);
        const remainingLinks = cache.links.slice(7);

        // Update cache
        linkCacheRef.current.set(nodeId, {
          links: remainingLinks,
          crossEdges: cache.crossEdges,
        });

        crossEdgesToAdd = cache.crossEdges;
        console.log(`✅ Used cached links for ${node.label}. ${remainingLinks.length} links remaining in cache.`);

      } else {
        // No cache available - fetch new batch of 28 from backend
        console.log(`🔄 Cache empty for ${node.label}, fetching new batch from backend...`);

        const existingNodeLabels = nodes.map(n => n.label);
        const existingNodeIds = nodes.map(n => n.id);

        const { links, crossEdges } = await fetchArticleLinks(
          node.label,
          existingNodeLabels,
          existingNodeIds,
          28
        );

        if (links.length === 0) {
          setError(`No more related articles found for "${node.label}"`);
          setLoading(false);
          return;
        }

        // Use first 7, cache the rest
        linksToAdd = links.slice(0, 7);
        const linksToCache = links.slice(7);

        // Update cache with new links
        linkCacheRef.current.set(nodeId, {
          links: linksToCache,
          crossEdges: crossEdges,
        });

        crossEdgesToAdd = crossEdges;
      }

      // Filter out nodes that already exist
      const nodesToAdd = linksToAdd.filter(link => {
        const linkNodeId = link.title.toLowerCase().replace(/\s+/g, '_');
        return !nodes.some(n => n.id === linkNodeId);
      });

      // STEP 1: Add all nodes first
      nodesToAdd.forEach(link => {
        const linkNodeId = link.title.toLowerCase().replace(/\s+/g, '_');
        
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
          const linkNodeId = link.title.toLowerCase().replace(/\s+/g, '_');
          
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
              });
            }
          }
        });

        // Add cross edges (connections between existing nodes)
        if (crossEdgesToAdd && crossEdgesToAdd.length > 0) {
          crossEdgesToAdd.forEach(edge => {
            const sourceId = edge.source.toLowerCase().replace(/\s+/g, '_');
            const targetId = edge.target.toLowerCase().replace(/\s+/g, '_');
            
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
                  score: edge.score
                });
              }
            }
          });
        }

        // Increment expansion count after everything is added
        incrementExpansionCount(nodeId);
      }, 50); // Small delay to ensure nodes are registered

    } catch (error) {
      console.error('Error expanding node:', error);
      setError(error instanceof Error ? error.message : 'Failed to expand node.');
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setLoading, incrementExpansionCount]);






  // Left click handler - expand graph
  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNode(nodeId);

    if (node.expansionCount === 0) {
      // First click - initial load
      loadArticle(node.label, node.depth);
    } else {
      // Subsequent clicks - expand with cache or new fetch
      expandNode(nodeId);
    }
  }, [nodes, loadArticle, expandNode, setSelectedNode]);








  // Right click handler - show explore modal with full text
  const handleNodeRightClick = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setLoading(true);
    
    try {
      // First show modal with summary
      const summary = await fetchArticleSummary(node.label);
      setModalArticle(summary);
      setLoading(false);
      
      // Then fetch and update with full text in background
      const fullText = await fetchArticleFullText(node.label);
      setModalArticle(prev => prev ? { ...prev, fullText } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
      setLoading(false);
    }
  }, [nodes, setLoading]);

  const handleSearch = useCallback((query: string) => {
    clearGraph();
    linkCacheRef.current.clear();  // Clear cache on new search
    setError(null);
    loadArticle(query, 0);
  }, [clearGraph, loadArticle]);

  return (
    <div className="flex flex-col h-screen w-screen bg-abyss font-sans text-gray-100 overflow-hidden">
      
      {/* Top Overlay Navigation */}
      <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-abyss via-abyss/80 to-transparent">
          
          {/* Logo Area */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="relative group">
              <div className="absolute -inset-2 bg-brand-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img src={weLogo} alt="wikiExplorer" className="relative w-10 h-10 opacity-90" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">wikiExplorer</h1>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                  {backendOnline ? 'System Online' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Search */}
          <div className="flex-1 max-w-2xl px-8 pointer-events-auto flex items-center gap-3">
            <RefreshButton onRefresh={handleHardRefresh} />
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* Right Counter */}
          <Counter />
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 animate-slide-up pointer-events-auto">
          <div className="flex items-center gap-3 px-6 py-3 bg-red-950/90 backdrop-blur border border-red-500/30 rounded-xl shadow-2xl">
            <span className="text-sm font-medium text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 relative overflow-hidden">
        <GraphCanvas 
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
        />
        
        {/* Empty State */}
        {nodes.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-abyss-surface border border-abyss-highlight shadow-2xl mb-4">
                <img src={weLogo} alt="" className="w-10 h-10 opacity-50 grayscale" />
              </div>
              <h2 className="text-2xl font-bold text-gray-700">Ready to Explore</h2>
              <p className="text-gray-600">Enter a topic above to generate the graph</p>
            </div>
          </div>
        )}
      </div>

      {/* Explore Modal */}
      {modalArticle && (
        <ExploreModal 
          article={modalArticle} 
          onClose={() => setModalArticle(null)} 
        />
      )}
    </div>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}