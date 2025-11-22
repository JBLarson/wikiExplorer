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
        <div className="h-8 bg-gray-200 rounded-lg w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      
      {/* Thumbnail Skeleton */}
      <div className="h-48 bg-gray-200 rounded-xl w-full"></div>
      
      {/* Extract Skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
      {/* Icon */}
      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a7 7 0 0114 0h1.945"></path>
        </svg>
      </div>
      
      {/* Text */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Start Your Journey
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        Search for any topic to begin exploring. Click nodes to expand the graph and discover connections.
      </p>
      
      {/* Hint */}
      <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-100">
        <p className="text-xs text-purple-700 font-medium">
          💡 Try searching: "Artificial Intelligence", "Ancient Rome", or "Quantum Physics"
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ selectedArticle, isLoading }: SidebarProps) {
  const { nodes, edges, rootNode } = useGraphStore();
  
  const rootNodeData = nodes.find(n => n.id === rootNode);
  
  return (
    <div className="w-96 h-full bg-white border-l border-gray-200 flex flex-col shadow-xl">
      {/* Article Content Section */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <SkeletonLoader />
        ) : selectedArticle ? (
          <div className="p-6 animate-fadeIn space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                {selectedArticle.title}
              </h2>
              {rootNodeData && selectedArticle.title === rootNodeData.label && (
                <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  Root Node
                </span>
              )}
            </div>
            
            {/* Thumbnail */}
            {selectedArticle.thumbnail && (
              <div className="relative overflow-hidden rounded-xl border border-gray-200 group">
                <img 
                  src={selectedArticle.thumbnail} 
                  alt={selectedArticle.title} 
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
            )}
            
            {/* Extract */}
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed">
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
                bg-gradient-to-r from-purple-600 to-purple-700
                text-white text-sm font-semibold rounded-xl
                hover:from-purple-700 hover:to-purple-800
                transition-all duration-200
                focus:outline-none focus:ring-4 focus:ring-purple-100
                shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                transform hover:-translate-y-0.5
              "
            >
              <span className="flex-1 text-center">Read Full Article</span>
              <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </a>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
      
      {/* Stats Footer Section */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-bold text-gray-900">Graph Statistics</h3>
          </div>
          
          <dl className="space-y-3">
            {/* Nodes */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <dt className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                Nodes
              </dt>
              <dd className="text-lg font-bold text-gray-900 tabular-nums">
                {nodes.length}
              </dd>
            </div>
            
            {/* Edges */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
              <dt className="flex items-center gap-2 text-sm text-gray-600">
                <LinkIcon className="w-3.5 h-3.5" />
                Connections
              </dt>
              <dd className="text-lg font-bold text-gray-900 tabular-nums">
                {edges.length}
              </dd>
            </div>
            
            {/* Depth (if we have a root) */}
            {rootNode && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <dt className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  Max Depth
                </dt>
                <dd className="text-lg font-bold text-gray-900 tabular-nums">
                  {Math.max(...nodes.map(n => n.depth), 0)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
