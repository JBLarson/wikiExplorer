import { useGraphStore } from '../stores/graphStore';
import type { WikiArticle } from '../types';
import { ArrowTopRightOnSquareIcon, ChartBarIcon, LinkIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
  selectedArticle: WikiArticle | null;
  isLoading: boolean;
}

function SkeletonLoader() {
  return (
    <div className="p-6 animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-8 bg-abyss-border rounded-lg w-3/4"></div>
        <div className="h-4 bg-abyss-border rounded w-1/2"></div>
      </div>
      <div className="h-48 bg-abyss-border rounded-xl w-full"></div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-3 bg-abyss-border rounded w-full opacity-60"></div>
        ))}
      </div>
    </div>
  );
}
export function Sidebar({ selectedArticle, isLoading }: SidebarProps) {
  const { nodes, edges, rootNode, selectedNode } = useGraphStore();
  const rootNodeData = nodes.find(n => n.id === rootNode);
  
  // Find the currently selected node
  const currentNode = nodes.find(n => n.id === selectedNode);

  return (
    <div className="w-96 h-full bg-abyss-surface/80 backdrop-blur-xl border-l border-abyss-border flex flex-col shadow-glass z-30 text-gray-100">
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading && !selectedArticle ? (
          <SkeletonLoader />
        ) : selectedArticle ? (
          <div className="p-6 animate-fade-in space-y-6">
            
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white leading-tight">
                {selectedArticle.title}
              </h2>
              {rootNodeData && selectedArticle.title === rootNodeData.label && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-glow border border-brand-primary/20">
                  Root Topic
                </span>
              )}
            </div>

            {/* Image */}
            {selectedArticle.thumbnail && (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-abyss-border group bg-black">
                <img 
                  src={selectedArticle.thumbnail} 
                  alt={selectedArticle.title} 
                  className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
                />
              </div>
            )}

            {/* Extract */}
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
              <p>{selectedArticle.extract}</p>
            </div>

            {/* CTA */}
            <a 
              href={selectedArticle.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-abyss-border hover:bg-abyss-hover text-brand-glow rounded-xl border border-abyss-highlight transition-all duration-200 group"
            >
              <span className="text-sm font-semibold">Read on Wikipedia</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        ) : currentNode ? (
          // Show basic info if we have the node but no full article yet
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white leading-tight">
                {currentNode.label}
              </h2>
              <p className="text-sm text-gray-400">Loading details...</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-60">
            <div className="w-16 h-16 rounded-2xl bg-abyss-border flex items-center justify-center mb-4 border border-abyss-highlight">
              <LinkIcon className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Knowledge Graph</h3>
            <p className="text-sm text-gray-400">Select a node to view details</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex-shrink-0 border-t border-abyss-border bg-abyss-surface p-6">
        <div className="flex items-center gap-2 mb-4 text-brand-glow">
          <ChartBarIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Graph Metrics</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-abyss rounded-lg p-3 border border-abyss-border">
            <div className="text-xs text-gray-500 mb-1">Nodes Loaded</div>
            <div className="text-xl font-bold text-white tabular-nums">{nodes.length}</div>
          </div>
          <div className="bg-abyss rounded-lg p-3 border border-abyss-border">
            <div className="text-xs text-gray-500 mb-1">Connections</div>
            <div className="text-xl font-bold text-white tabular-nums">{edges.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}