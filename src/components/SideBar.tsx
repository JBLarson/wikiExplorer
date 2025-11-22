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
      {/* Title Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-abyss-border rounded-lg w-3/4"></div>
        <div className="h-4 bg-abyss-border rounded w-1/2"></div>
      </div>
      
      {/* Thumbnail Skeleton */}
      <div className="h-48 bg-abyss-border rounded-xl w-full"></div>
      
      {/* Extract Skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-abyss-border rounded w-full"></div>
        <div className="h-4 bg-abyss-border rounded w-full"></div>
        <div className="h-4 bg-abyss-border rounded w-5/6"></div>
        <div className="h-4 bg-abyss-border rounded w-3/4"></div>
        <div className="h-4 bg-abyss-border rounded w-2/3"></div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
      {/* Icon */}
      <div className="w-20 h-20 bg-abyss-border/50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-abyss-highlight">
        <svg className="w-10 h-10 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a7 7 0 0114 0h1.945"></path>
        </svg>
      </div>
      
      {/* Text */}
      <h3 className="text-xl font-bold text-white mb-2">
        Deep Exploration
      </h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
        Select a node or search for a topic to begin your journey through the knowledge graph.
      </p>
      
      {/* Hint */}
      <div className="mt-8 p-4 bg-abyss-border/30 rounded-lg border border-brand-accent/20">
        <p className="text-xs text-brand-300 font-medium">
          💡 Try: "Neural Networks", "Dark Matter", or "Renaissance Art"
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ selectedArticle, isLoading }: SidebarProps) {
  const { nodes, edges, rootNode } = useGraphStore();
  
  const rootNodeData = nodes.find(n => n.id === rootNode);
  
  return (
    <div className="w-96 h-full bg-abyss-surface border-l border-abyss-border flex flex-col shadow-2xl z-30">
      {/* Article Content Section */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <SkeletonLoader />
        ) : selectedArticle ? (
          <div className="p-6 animate-slideInLeft space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {selectedArticle.title}
              </h2>
              {rootNodeData && selectedArticle.title === rootNodeData.label && (
                <span className="inline-flex items-center px-2.5 py-0.5 bg-brand-accent/20 text-brand-300 text-xs font-medium rounded-full border border-brand-accent/30">
                  Root Node
                </span>
              )}
            </div>
            
            {/* Thumbnail */}
            {selectedArticle.thumbnail && (
              <div className="relative overflow-hidden rounded-xl border border-abyss-border group bg-abyss-black">
                <img 
                  src={selectedArticle.thumbnail} 
                  alt={selectedArticle.title} 
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none"></div>
              </div>
            )}
            
            {/* Extract */}
            <div className="prose prose-sm prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed">
                {selectedArticle.extract}
              </p>
            </div>
            
            {/* Action Button */}
            <a 
              href={selectedArticle.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="
                inline-flex items-center gap-2 px-4 py-3 w-full
                bg-brand-accent/10 hover:bg-brand-accent/20
                text-brand-300 text-sm font-semibold rounded-xl
                border border-brand-accent/30 hover:border-brand-accent/50
                transition-all duration-200
                group
              "
            >
              <span className="flex-1 text-center group-hover:text-white transition-colors">Read Full Article</span>
              <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      
      {/* Stats Footer Section */}
      <div className="flex-shrink-0 border-t border-abyss-border bg-abyss-surface/50 backdrop-blur">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Graph Intelligence</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Nodes */}
            <div className="p-3 bg-abyss rounded-lg border border-abyss-border">
              <dt className="text-xs text-gray-500 mb-1">Nodes</dt>
              <dd className="text-lg font-bold text-white tabular-nums flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(99,102,241,0.8)]"></span>
                {nodes.length}
              </dd>
            </div>
            
            {/* Edges */}
            <div className="p-3 bg-abyss rounded-lg border border-abyss-border">
              <dt className="text-xs text-gray-500 mb-1">Connections</dt>
              <dd className="text-lg font-bold text-white tabular-nums flex items-center gap-2">
                <LinkIcon className="w-3 h-3 text-gray-600" />
                {edges.length}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}