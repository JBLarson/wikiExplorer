// frontend/src/App.tsx
import { useState, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { GraphCanvas } from './components/GraphCanvas';
import { GraphComparison } from './components/GraphComparison';
import { RefreshButton } from './components/RefreshButton';
import { SearchBar } from './components/SearchBar';
import { GraphStatsModal } from './components/modals/GraphStats';
import { WikiModal } from './components/modals/WikiModal';
import { StatsButton } from './components/StatsButton';
import { SaveGraphButton } from './components/SaveGraphButton';
import { LoadGraphButton } from './components/LoadGraphButton';
import { Counter } from './components/Counter';
import { useGraphStore } from './stores/graphStore';
import { checkBackendHealth } from './lib/wikipedia';
import { useArticleLoader } from './hooks/useArticleLoader';
import { useNodeExpander } from './hooks/useNodeExpander';
import { useGraphRefresh } from './hooks/useGraphRefresh';
import { linkCache } from './services/linkCache';
import weLogo from './assets/wikiExplorer-logo-300.png';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type ViewMode = 'graph' | 'comparison';

function AppContent() {
  const { nodes, edges, setSelectedNode, clearGraph, isLoading } = useGraphStore();
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [wikiModalData, setWikiModalData] = useState({ url: '', title: '' });
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { loadArticle } = useArticleLoader();
  const { expandNode } = useNodeExpander();
  const { handleHardRefresh, handleRefreshEdges } = useGraphRefresh(
    queryClient,
    () => {},
    setError,
    useGraphStore.getState().setLoading
  );

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleGraphLoad = useCallback(() => {
    linkCache.clear();
    setError(null);
    setShowWikiModal(false);
    setMobileMenuOpen(false);
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

  const handleNodeRightClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setWikiModalData({ url: node.data.url, title: node.label });
    setShowWikiModal(true);
  }, [nodes]);

  const handleStatsNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNode(nodeId);
  }, [nodes, setSelectedNode]);

  const handleSearch = useCallback((query: string, isPrivate: boolean = false) => {
    clearGraph();
    linkCache.clear();
    setError(null);
    setShowWikiModal(false);
    setMobileMenuOpen(false);
    loadArticle(query, 0, setError, isPrivate);
  }, [clearGraph, loadArticle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showStatsModal) {
          setShowStatsModal(false);
        } else if (showWikiModal) {
          setShowWikiModal(false);
        } else if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStatsModal, showWikiModal, mobileMenuOpen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-abyss font-sans text-gray-100 overflow-hidden">
      
      {/* Desktop Header */}
      <div className="hidden md:block absolute top-0 left-0 w-full z-50 pointer-events-none">
        <div className="flex items-center justify-between p-6 bg-gradient-to-b from-abyss via-abyss/80 to-transparent">
          
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

          {viewMode === 'graph' && (
            <div className="flex-1 max-w-4xl px-8 pointer-events-auto flex items-center gap-3">
              <RefreshButton 
                onRefreshApp={handleHardRefresh}
                onRefreshEdges={handleRefreshEdges}
              />
              <StatsButton onOpenStats={() => setShowStatsModal(true)} nodeCount={nodes.length} />
              
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              
              <div className="flex flex-row gap-2">
                <SaveGraphButton disabled={nodes.length === 0} />
                <LoadGraphButton onLoad={handleGraphLoad} />
              </div>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-4">
            {viewMode === 'graph' && <Counter />}
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border rounded-xl p-1">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'graph'
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-abyss-hover'
                }`}
              >
                Graph
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  viewMode === 'comparison'
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-400 hover:text-white hover:bg-abyss-hover'
                }`}
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden absolute top-0 left-0 w-full z-50 pointer-events-none">
        <div className="flex items-center justify-between p-4 bg-abyss-surface/95 backdrop-blur-xl border-b border-abyss-border pointer-events-auto">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={weLogo} alt="wikiExplorer" className="w-8 h-8 opacity-90" />
            <div>
              <h1 className="text-sm font-bold text-white">wikiExplorer</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${backendOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[8px] uppercase tracking-wider text-gray-500">
                  {backendOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats + Menu */}
          <div className="flex items-center gap-3">
            {viewMode === 'graph' && <Counter />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-abyss-hover rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-white" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="pointer-events-auto bg-abyss-surface/98 backdrop-blur-xl border-b border-abyss-border shadow-2xl animate-slide-down">
            <div className="p-4 space-y-3">
              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewMode('graph');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'graph'
                      ? 'bg-brand-primary text-white'
                      : 'bg-abyss text-gray-400'
                  }`}
                >
                  Graph
                </button>
                <button
                  onClick={() => {
                    setViewMode('comparison');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'comparison'
                      ? 'bg-brand-primary text-white'
                      : 'bg-abyss text-gray-400'
                  }`}
                >
                  Compare
                </button>
              </div>

              {viewMode === 'graph' && (
                <>
                  {/* Search */}
                  <SearchBar onSearch={handleSearch} isLoading={isLoading} />
                  
                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <StatsButton onOpenStats={() => { setShowStatsModal(true); setMobileMenuOpen(false); }} nodeCount={nodes.length} />
                    <RefreshButton 
                      onRefreshApp={handleHardRefresh}
                      onRefreshEdges={handleRefreshEdges}
                    />
                    <SaveGraphButton disabled={nodes.length === 0} />
                    <LoadGraphButton onLoad={handleGraphLoad} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 animate-slide-up pointer-events-auto max-w-[90vw]">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-950/90 backdrop-blur border border-red-500/30 rounded-xl shadow-2xl">
            <span className="text-sm font-medium text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {viewMode === 'graph' ? (
          <>
            <GraphCanvas 
              onNodeClick={handleNodeClick}
              onNodeRightClick={handleNodeRightClick}
              isSidebarOpen={showWikiModal}
            />
            
            {nodes.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-abyss-surface border border-abyss-highlight shadow-2xl mb-4">
                    <img src={weLogo} alt="" className="w-8 h-8 md:w-10 md:h-10 opacity-50 grayscale" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-700">Ready to Explore</h2>
                  <p className="text-sm md:text-base text-gray-600">Search a topic to generate the graph</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <GraphComparison />
        )}
      </div>

      {/* Modals */}
      {showStatsModal && (
        <GraphStatsModal
          nodes={nodes}
          edges={edges}
          onClose={() => setShowStatsModal(false)}
          onNodeClick={handleStatsNodeClick}
        />
      )}

      {showWikiModal && (
        <WikiModal
          isOpen={showWikiModal}
          url={wikiModalData.url}
          title={wikiModalData.title}
          onClose={() => setShowWikiModal(false)}
        />
      )}
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