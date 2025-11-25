import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GraphCanvas } from './components/GraphCanvas';
import { RefreshButton } from './components/RefreshButton';
import { SearchBar } from './components/SearchBar';
import { GraphStatsModal } from './components/modals/GraphStats';
import { StatsButton } from './components/StatsButton';
import { SaveGraphButton } from './components/SaveGraphButton';
import { LoadGraphButton } from './components/LoadGraphButton';
import { Counter } from './components/Counter';
import { ExploreModal } from './components/modals/Explore';
import { useGraphStore } from './stores/graphStore';
import { fetchArticleSummary, fetchArticleFullText, checkBackendHealth } from './lib/wikipedia';
import { useArticleLoader } from './hooks/useArticleLoader';
import { useNodeExpander } from './hooks/useNodeExpander';
import { useGraphRefresh } from './hooks/useGraphRefresh';
import { linkCache } from './services/linkCache';
import type { WikiArticle } from './types';
import weLogo from './assets/wikiExplorer-logo-300.png';
import { useEffect } from 'react';

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
    setSelectedNode,
    clearGraph,
    isLoading,
    rootNode,
  } = useGraphStore();

  const [modalArticle, setModalArticle] = useState<WikiArticle | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Custom hooks
  const { loadArticle } = useArticleLoader();
  const { expandNode } = useNodeExpander();
  const { handleHardRefresh, handleRefreshEdges } = useGraphRefresh(
    queryClient,
    setModalArticle,
    setError,
    useGraphStore.getState().setLoading
  );

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleGraphLoad = useCallback(() => {
    linkCache.clear();
    setModalArticle(null);
    setError(null);
  }, []);




  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setSelectedNode(nodeId);

    if (node.expansionCount === 0) {
      loadArticle(node.label, node.depth, setError);
    } else {
      expandNode(nodeId, setError);
    }
  }, [nodes, loadArticle, expandNode, setSelectedNode]);




  const handleNodeRightClick = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    useGraphStore.getState().setLoading(true);
    
    try {
      // Fetch the summary first (this includes extract)
      const summary = await fetchArticleSummary(node.label);
      setModalArticle(summary);
      useGraphStore.getState().setLoading(false);
      
      // Then fetch and update with full text in background
      const fullText = await fetchArticleFullText(node.label);
      setModalArticle(prev => prev ? { ...prev, fullText } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
      useGraphStore.getState().setLoading(false);
    }
  }, [nodes]);




  const handleStatsNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNode(nodeId);
  }, [nodes, setSelectedNode]);




  const handleSearch = useCallback((query: string) => {
    clearGraph();
    linkCache.clear();
    setError(null);
    loadArticle(query, 0, setError);
  }, [clearGraph, loadArticle]);




  // ESC key to close stats modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showStatsModal) {
        setShowStatsModal(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStatsModal]);

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
          <div className="flex-1 max-w-4xl px-8 pointer-events-auto flex items-center gap-3">
            <RefreshButton 
              onRefreshApp={handleHardRefresh}
              onRefreshEdges={handleRefreshEdges}
            />

            <StatsButton onOpenStats={() => setShowStatsModal(true)} nodeCount={nodes.length} />
            
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            
            <div className="flex flex-row">
              <SaveGraphButton disabled={nodes.length === 0} />
              <LoadGraphButton onLoad={handleGraphLoad} />
            </div>
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

      {/* Stats Modal */}
      {showStatsModal && (
        <GraphStatsModal
          nodes={nodes}
          edges={edges}
          onClose={() => setShowStatsModal(false)}
          onNodeClick={handleStatsNodeClick}
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