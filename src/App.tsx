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

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const loadArticle = useCallback(async (title: string, depth: number = 0) => {
    setLoading(true);
    setError(null);

    const existingNodeLabels = nodes.map(n => n.label);

    try {
      // Fetch article summary
      const article = await fetchArticleSummary(title);
      setSelectedArticle(article);

      const nodeId = title.replace(/\s+/g, '_');

      // Add node to graph
      addNode({
        id: nodeId,
        label: title,
        data: article,
        depth,
      });

      setSelectedNode(nodeId);
      addToHistory(nodeId);

      // Set as root if this is the first node
      if (nodes.length === 0) {
        setRootNode(nodeId);
      }

      // Fetch related articles
      const links = await fetchArticleLinks(title, existingNodeLabels, 7);

      // Add related nodes and edges
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
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to load article. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [nodes, addNode, addEdge, setSelectedNode, addToHistory, setRootNode, setLoading]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const hasChildren = edges.some(e => e.source === nodeId);

    // Always show info on click
    setLoading(true);
    setSelectedArticle(null);
    fetchArticleSummary(node.label)
      .then(setSelectedArticle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    setSelectedNode(nodeId);

    // Only load new nodes if they don't exist
    if (!hasChildren) {
      loadArticle(node.label, node.depth);
    }
  }, [nodes, edges, loadArticle, setSelectedNode, setLoading]);

  const handleNodeRightClick = useCallback((nodeId: string, x: number, y: number) => {
    console.log('Right click on node:', nodeId, 'at', x, y);
    // Future: Context Menu implementation
  }, []);

  const handleSearch = useCallback((query: string) => {
    clearGraph();
    setSelectedArticle(null);
    setError(null);
    loadArticle(query, 0);
  }, [clearGraph, loadArticle]);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-white z-20 shadow-sm">
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <img src={weLogo} alt="wikiExplorer Logo" className="w-20 h-20" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                wikiExplorer
              </h1>
              {backendOnline === false && (
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Backend offline
                </p>
              )}
            </div>
          </div>

          {/* Centered Search Bar */}
          <div className="flex-1 flex justify-center px-8 max-w-2xl mx-auto">
            <div className="w-full">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>
          </div>

          {/* Graph Stats */}
          <div className="text-sm text-gray-500 text-right min-w-[120px]">
            <span className="font-semibold text-gray-900 tabular-nums">{nodes.length}</span>
            <span className="ml-1">nodes</span>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-6 py-3 animate-slideInUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={handleClearError}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative">
          <GraphCanvas
            onNodeClick={handleNodeClick}
            onNodeRightClick={handleNodeRightClick}
          />
          
          {/* Loading Overlay */}
          {isLoading && nodes.length === 0 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">Loading graph...</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
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
