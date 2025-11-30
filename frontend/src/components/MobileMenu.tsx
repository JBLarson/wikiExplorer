// frontend/src/components/MobileMenu.tsx
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { SearchBar } from './SearchBar';
import { StatsButton } from './StatsButton';
import { RefreshButton } from './RefreshButton';
import { SaveGraphButton } from './SaveGraphButton';
import { LoadGraphButton } from './LoadGraphButton';
import { Counter } from './Counter';
import weLogo from '../assets/wikiExplorer-logo-300.png';

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  viewMode: 'graph' | 'comparison';
  onViewModeChange: (mode: 'graph' | 'comparison') => void;
  backendOnline: boolean | null;
  nodeCount: number;
  onSearch: (query: string, isPrivate: boolean) => void;
  isLoading: boolean;
  onOpenStats: () => void;
  onRefreshApp: () => void;
  onRefreshEdges: () => void;
  onGraphLoad: () => void;
  nodesExist: boolean;
}

export function MobileMenu({
  isOpen,
  onToggle,
  viewMode,
  onViewModeChange,
  backendOnline,
  nodeCount,
  onSearch,
  isLoading,
  onOpenStats,
  onRefreshApp,
  onRefreshEdges,
  onGraphLoad,
  nodesExist,
}: MobileMenuProps) {
  return (
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
            onClick={onToggle}
            className="p-2 hover:bg-abyss-hover rounded-lg transition-colors"
          >
            {isOpen ? (
              <XMarkIcon className="w-6 h-6 text-white" />
            ) : (
              <Bars3Icon className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="pointer-events-auto bg-abyss-surface/98 backdrop-blur-xl border-b border-abyss-border shadow-2xl animate-slide-down">
          <div className="p-4 space-y-3">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onViewModeChange('graph');
                  onToggle();
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
                  onViewModeChange('comparison');
                  onToggle();
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
                <SearchBar onSearch={onSearch} isLoading={isLoading} />
                
                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <StatsButton onOpenStats={() => { onOpenStats(); onToggle(); }} nodeCount={nodeCount} />
                  <RefreshButton 
                    onRefreshApp={onRefreshApp}
                    onRefreshEdges={onRefreshEdges}
                  />
                  <SaveGraphButton disabled={!nodesExist} />
                  <LoadGraphButton onLoad={onGraphLoad} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}