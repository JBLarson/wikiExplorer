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
  
  // Normalize the node ID to underscored lowercase
  const nodeId = title.toLowerCase().replace(/\s+/g, '_');
  
  // Prepare context - use node IDs (which are already underscored)
  const existingNodeLabels = nodes.map(n => n.label);
  const existingNodeIds = nodes.map(n => n.id); 

  try {
    // 1. Fetch Article Metadata (this might return different casing)
    const article = await fetchArticleSummary(title);
    setSelectedArticle(article);

    // 2. Add the Central Node with normalized ID
    addNode({
      id: nodeId,
      label: article.title,  // Use the canonical title from Wikipedia
      data: article,
      depth,
    });

    setSelectedNode(nodeId);
    addToHistory(nodeId);

    if (nodes.length === 0) {
      setRootNode(nodeId);
    }

    // 3. Fetch Semantic Links & Cross Edges
    const { links, crossEdges } = await fetchArticleLinks(
      article.title,  // Use canonical title
      existingNodeLabels, 
      existingNodeIds, 
      7
    );

    // 4. Add New Nodes
    for (const link of links) {
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
      });
      
      // Link from Parent -> Child
      addEdge({
        id: `${nodeId}-${linkNodeId}`,
        source: nodeId,
        target: linkNodeId,
        score: link.score,
      });
    }

    // 5. Add Cross Edges
    if (crossEdges && crossEdges.length > 0) {
      for (const edge of crossEdges) {
        // Normalize edge IDs to match our node IDs
        const sourceId = edge.source.toLowerCase().replace(/\s+/g, '_');
        const targetId = edge.target.toLowerCase().replace(/\s+/g, '_');
        
        addEdge({
          id: `cross-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          score: edge.score
        });
      }
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

    setLoading(true);
    setSelectedArticle(null);
    
    // Use the node's label (canonical title) for fetching
    fetchArticleSummary(node.label)
      .then(setSelectedArticle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    setSelectedNode(nodeId);
    loadArticle(node.label, node.depth);  // Use label, not ID
  }, [nodes, loadArticle, setSelectedNode, setLoading]);

  const handleSearch = useCallback((query: string) => {
    clearGraph();
    setSelectedArticle(null);
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
          <div className="flex-1 max-w-2xl px-8 pointer-events-auto">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          </div>

          {/* Right Placeholder (Balance) */}
          <div className="w-[140px]" />
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
      <div className="flex-1 flex overflow-hidden relative z-0">
        <div className="flex-1 relative">
          <GraphCanvas onNodeClick={handleNodeClick} />
          
          {/* Empty State / Initial Loading */}
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
        <Sidebar selectedArticle={selectedArticle} isLoading={isLoading && !selectedArticle} />
      </div>
    </div>
  );
}

// Helper for Icon
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