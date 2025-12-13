// frontend/src/App.tsx
import { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { GraphCanvasRef } from './components/GraphCanvas';
import { NodeOutline } from './components/NodeOutline';
import { MobileInterface } from './components/MobileInterface';
import { RefreshButton } from './components/RefreshButton';
import { SearchBar } from './components/SearchBar';
import { AboutModal } from './components/modals/AboutModal';
import { GraphStatsModal } from './components/modals/GraphStats';
import { WikiModal } from './components/modals/WikiModal';
import { StatsButton } from './components/StatsButton';
import { FileMenu } from './components/FileMenu';
import { FindNode } from './components/FindNode';
import { Counter } from './components/Counter';
import { QualityToggle } from './components/QualityToggle';
import { useGraphStore } from './stores/graphStore';
import { checkBackendHealth } from './lib/wikipedia';
import { useArticleLoader } from './hooks/useArticleLoader';
import { useNodeExpander } from './hooks/useNodeExpander';
import { useGraphRefresh } from './hooks/useGraphRefresh';
import { linkCache } from './services/linkCache';
import weLogo from './assets/wikiExplorer-logo-300.png';

const GraphCanvas3D = lazy(() => import('./components/GraphCanvas').then(module => ({ 
  default: module.GraphCanvas 
})));

const GraphCanvas2D = lazy(() => import('./components/GraphCanvas2D').then(module => ({ 
  default: module.GraphCanvas2D 
})));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { nodes, edges, setSelectedNode, clearGraph, isLoading, graphicsQuality } = useGraphStore();
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [wikiModalData, setWikiModalData] = useState({ url: '', title: '' });
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [graphMounted, setGraphMounted] = useState(false);

  const graphCanvasRef = useRef<GraphCanvasRef>(null);

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

  useEffect(() => {
    if (nodes.length > 0 && !graphMounted) {
      setTimeout(() => setGraphMounted(true), 50);
    }
  }, [nodes.length, graphMounted]);

  const handleGraphLoad = useCallback(() => {
    linkCache.clear();
    setError(null);
    setShowWikiModal(false);
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

  const handleFindNodeSelect = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    if (graphicsQuality === 'high') {
      graphCanvasRef.current?.focusNode(nodeId);
    }
  }, [setSelectedNode, graphicsQuality]);

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
    if (graphicsQuality === 'high') {
      graphCanvasRef.current?.focusNode(nodeId);
    }
  }, [nodes, setSelectedNode, graphicsQuality]);

  const handleSearch = useCallback((query: string, isPrivate: boolean = false) => {
    clearGraph();
    linkCache.clear();
    setError(null);
    setShowWikiModal(false);
    loadArticle(query, 0, setError, isPrivate);
  }, [clearGraph, loadArticle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showStatsModal) setShowStatsModal(false);
        else if (showWikiModal) setShowWikiModal(false);
        else if (sidebarOpen) setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStatsModal, showWikiModal, sidebarOpen]);

  return (
    <div className="fixed inset-0 w-full h-full bg-abyss font-sans text-gray-100 overflow-hidden select-none touch-none">
      
      {/* HEADER */}
      <div className="hidden lg:block absolute top-0 left-0 w-full z-50 pointer-events-none">
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

          <div className="flex-1 max-w-6xl px-8 pointer-events-auto flex items-center gap-3">
            <RefreshButton 
              onRefreshApp={handleHardRefresh}
              onRefreshEdges={handleRefreshEdges}
            />
            <StatsButton onOpenStats={() => setShowStatsModal(true)} nodeCount={nodes.length} />
            <QualityToggle />

            <div className="flex-1 min-w-[300px]">
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            </div>

            <FindNode onNodeSelect={handleFindNodeSelect} />

            <FileMenu 
              onGraphLoad={handleGraphLoad}
              disabled={nodes.length === 0}
            />

            <button
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-2 px-4 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group"
              title="About wikiExplorer"
            >
              <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                About
              </span>
            </button>
          </div>

          <div className="pointer-events-auto">
            <Counter />
          </div>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 z-[60] animate-slide-up pointer-events-auto max-w-[90vw]">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-950/90 backdrop-blur border border-red-500/30 rounded-xl shadow-2xl">
            <span className="text-sm font-medium text-red-200">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* GRAPH CONTAINER */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        
        <div className="hidden lg:block">
          <NodeOutline 
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onNodeClick={handleStatsNodeClick}
          />
        </div>

        {graphMounted && nodes.length > 0 ? (
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Loading graphics engine...</span>
              </div>
            </div>
          }>
            {graphicsQuality === 'high' ? (
              <GraphCanvas3D
                key="3d-engine"
                ref={graphCanvasRef}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                isSidebarOpen={showWikiModal || sidebarOpen}
              />
            ) : (
              <GraphCanvas2D
                key="2d-engine"
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick} // WIRED UP HERE
              />
            )}
          </Suspense>
        ) : (
          !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-10">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-abyss-surface border border-abyss-highlight shadow-2xl mb-4">
                  <img src={weLogo} alt="" className="w-8 h-8 md:w-10 md:h-10 opacity-80 grayscale" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-300">Ready to Explore</h2>
                <p className="text-sm md:text-base text-gray-500">Search a topic to generate the graph</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* MOBILE UI */}
      <MobileInterface 
        onSearch={handleSearch}
        isLoading={isLoading}
        backendOnline={backendOnline}
        onOpenStats={() => setShowStatsModal(true)}
        onRefreshApp={handleHardRefresh}
        onRefreshEdges={handleRefreshEdges}
        onGraphLoad={handleGraphLoad}
        onNodeClick={handleStatsNodeClick}
      />

      {/* MODALS */}
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

      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
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