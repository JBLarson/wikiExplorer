import { useState, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphCanvas } from './components/GraphCanvas';
import { SearchBar } from './components/SearchBar';
import { Sidebar } from './components/Sidebar';
import { useGraphStore } from './stores/graphStore';
import { fetchArticleSummary, fetchArticleLinks, checkBackendHealth } from './lib/wikipedia';
import type { WikiArticle } from './types';
import weLogo from './assets/wikiExplorer-logo-300.png';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const {
    nodes,
    edges,
    addNode,
    addEdge,
    setSelectedNode,
    setRootNode,
    addToHistory,
    clearGraph,
    setLoading,
    isLoading,
  } = useGraphStore();

  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const loadArticle = useCallback(async (title: string, depth: number = 0) => {
    setLoading(true);
    setError(null);

    const existingNodeLabels = nodes.map(n => n.label);

    try {
      const article = await fetchArticleSummary(title);
      setSelectedArticle(article);
      
      // FIX: Replaced hallucinated variable name
      const nodeId = title.replace(/\s+/g, '_');

      addNode({
        id: nodeId,
        label: title,
        data: article,
        depth,
      });

      setSelectedNode(nodeId);
      addToHistory(nodeId);

      if (nodes.length === 0) {
        setRootNode(nodeId);
      }

      const links = await fetchArticleLinks(title, existingNodeLabels, 7);

      for (const link of links) {
        const linkNodeId = link.title.replace(/\s+/g, '_');
        addNode({
          id: linkNodeId,
          label: link.title,
          data: {
            title: link.title,
            extract: '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(link.title)}`,
          },
          depth: depth + 1,
        });
        addEdge({
          id: `${nodeId}-${linkNodeId}`,
          source: nodeId,
          target: linkNodeId,
          score: link.score,
        });
      }
    } catch (error) {
      console.error('Error loading article:', error);
      setError(error instanceof Error ? error.message : 'Failed to load article.');
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setSelectedNode, addToHistory, setRootNode, setLoading]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const hasChildren = edges.some(e => e.source === nodeId || e.target === nodeId);

    setLoading(true);
    setSelectedArticle(null);
    fetchArticleSummary(node.label)
      .then(setSelectedArticle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    setSelectedNode(nodeId);

    loadArticle(node.label, node.depth);
  }, [nodes, edges, loadArticle, setSelectedNode, setLoading]);

  const handleNodeRightClick = useCallback((nodeId: string) => {
    // FIX: Replaced hallucinated ZSnodeId
    console.log('Right click:', nodeId);
  }, []);

  const handleSearch = useCallback((query: string) => {
    clearGraph();
    setSelectedArticle(null);
    setError(null);
    loadArticle(query, 0);
  }, [clearGraph, loadArticle]);

  const handleClearError = useCallback(() => setError(null), []);

  return (
    <div className="flex flex-col h-screen bg-abyss font-sans overflow-hidden text-gray-100">
      {/* Header Overlay */}
      <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="flex items-center justify-between h-20 px-6 bg-gradient-to-b from-abyss to-transparent">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="relative">
              <img src={weLogo} alt="wikiExplorer" className="w-12 h-12 opacity-90 hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-brand-accent/20 blur-xl rounded-full -z-10"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">wikiExplorer 3D</h1>
              <div className="flex items-center gap-2">
                {backendOnline === false ? (
                  <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    Offline
                  </span>
                ) : (
                  <span className="text-[10px] text-brand-400 font-medium flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shadow-[0_0_5px_rgba(56,189,248,0.8)]"></span>
                     Connected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex justify-center px-8 max-w-2xl mx-auto pointer-events-auto">
            <div className="w-full shadow-2xl shadow-abyss">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>

          <div className="text-sm text-gray-400 text-right min-w-[120px] pointer-events-auto">
            <span className="font-bold text-white tabular-nums">{nodes.length}</span>
            <span className="ml-1 text-gray-600 text-xs uppercase tracking-wider">nodes</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-500/50 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-sm text-red-200 font-medium">{error}</p>
          <button onClick={handleClearError} className="ml-4 text-white underline">Dismiss</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative bg-abyss">
          <GraphCanvas onNodeClick={handleNodeClick} onNodeRightClick={handleNodeRightClick} />
          
          {isLoading && nodes.length === 0 && (
            <div className="absolute inset-0 bg-abyss/60 backdrop-blur-sm flex items-center justify-center z-10 pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-abyss-highlight border-t-brand-accent rounded-full animate-spin mx-auto mb-4 shadow-glow" />
                <p className="text-sm font-medium text-brand-200 tracking-wide">Initializing 3D Environment...</p>
              </div>
            </div>
          )}
        </div>
        <Sidebar selectedArticle={selectedArticle} isLoading={isLoading && selectedArticle === null} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}