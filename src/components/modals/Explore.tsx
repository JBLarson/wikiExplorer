import { WikiArticle } from '../../types';
import { ArrowTopRightOnSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ExploreModalProps {
  article: WikiArticle;
  onClose: () => void;
}

export function ExploreModal({ article, onClose }: ExploreModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-abyss-border">
          <h2 className="text-2xl font-bold text-white leading-tight pr-8">
            {article.title}
          </h2>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Thumbnail */}
          {article.thumbnail && (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-abyss-border group bg-black">
              <img 
                src={article.thumbnail} 
                alt={article.title} 
                className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
              />
            </div>
          )}

          {/* Extract */}
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-gray-300 leading-relaxed">
              {article.extract}
            </p>
          </div>

          {/* CTA */}
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-primary hover:bg-brand-glow text-white rounded-xl transition-all duration-200 group"
          >
            <span className="text-sm font-semibold">Read on Wikipedia</span>
            <ArrowTopRightOnSquareIcon className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}