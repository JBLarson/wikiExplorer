import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface WikiModalProps {
  isOpen: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export function WikiModal({ isOpen, url, title, onClose }: WikiModalProps) {
  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pointer-events-auto">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative h-full w-2/5 min-w-[500px] max-w-[900px] bg-abyss-surface border-l border-abyss-border shadow-2xl flex flex-col animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-abyss-border bg-abyss">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
            <button
              onClick={handleOpenInNewTab}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-brand-glow transition-colors rounded-lg hover:bg-abyss-hover"
              title="Open in new tab"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={title}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </div>
    </div>
  );
}