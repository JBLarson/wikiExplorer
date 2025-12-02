import { useState, useRef, useEffect } from 'react';
import { 
  ListBulletIcon, 
  Cog6ToothIcon, 
  XMarkIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronUpIcon,   // Added
  ChevronDownIcon  // Added
} from '@heroicons/react/24/outline';
import { SearchBar } from './SearchBar';
import { Counter } from './Counter';
import { NodeOutline } from './NodeOutline';
import { useGraphStore } from '../stores/graphStore';
import { QualityToggle } from './QualityToggle';
import weLogo from '../assets/wikiExplorer-logo-300.png';

interface MobileInterfaceProps {
  onSearch: (query: string, isPrivate: boolean) => void;
  isLoading: boolean;
  backendOnline: boolean | null;
  onOpenStats: () => void;
  onRefreshApp: () => void;
  onRefreshEdges: () => void;
  onGraphLoad: () => void;
  onNodeClick: (nodeId: string) => void;
}

export function MobileInterface({
  onSearch,
  isLoading,
  backendOnline,
  onOpenStats,
  onRefreshApp,
  onRefreshEdges,
  onGraphLoad,
  onNodeClick
}: MobileInterfaceProps) {
  const [activeSheet, setActiveSheet] = useState<'none' | 'outline' | 'tools'>('none');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // NEW: State to track if the bottom menu is visible
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  
  const { nodes, exportGraphToJSON, rootNode } = useGraphStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close sheets when clicking the graph (background)
  useEffect(() => {
    const handleBackgroundClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS') {
        setActiveSheet('none');
        setIsSearchExpanded(false);
        // Optional: Hide menu on background click too? 
        // For now let's keep it manual/on-search to avoid frustration.
      }
    };
    window.addEventListener('click', handleBackgroundClick);
    return () => window.removeEventListener('click', handleBackgroundClick);
  }, []);

  // --- Handlers ---

  const handleSearchWrapper = (query: string, isPrivate: boolean) => {
    onSearch(query, isPrivate);
    setIsSearchExpanded(false);
    // NEW: Auto-hide menu after search to maximize view
    setIsMenuVisible(false);
  };

  const handleSave = () => {
    const rootNodeData = nodes.find(n => n.id === rootNode);
    exportGraphToJSON(rootNodeData?.label || 'Mobile_Save');
    setActiveSheet('none');
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
    setActiveSheet('none');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const savedGraph = JSON.parse(content);
        useGraphStore.getState().importGraphFromJSON(savedGraph);
        onGraphLoad();
      } catch (err) {
        alert('Failed to load graph');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="lg:hidden pointer-events-none absolute inset-0 z-40 flex flex-col justify-between overflow-hidden">
      
      {/* --- Top Status Bar --- */}
      <div className="pointer-events-auto pt-4 px-4 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          {/* Logo Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-abyss-surface/80 backdrop-blur-md border border-abyss-border rounded-full shadow-lg">
            <img src={weLogo} alt="WE" className="w-5 h-5 opacity-90" />
            <div className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
          </div>
        </div>
        
        {/* Counter */}
        <Counter />
      </div>

      {/* --- Show Menu Trigger (Visible when menu is hidden) --- */}
      <div className={`
        pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 z-50
        transition-all duration-300 ease-out
        ${isMenuVisible ? 'translate-y-20 opacity-0' : 'translate-y-0 opacity-100'}
      `}>
        <button 
          onClick={() => setIsMenuVisible(true)}
          className="flex items-center justify-center w-12 h-12 bg-abyss-surface/80 backdrop-blur-xl border border-abyss-border rounded-full shadow-glass hover:bg-abyss-hover active:scale-95 transition-all text-brand-glow animate-pulse-slow"
        >
          <ChevronUpIcon className="w-6 h-6" />
        </button>
      </div>

      {/* --- Bottom Controls Container --- */}
      <div className={`
        pointer-events-auto pb-6 px-4 flex flex-col gap-3 relative z-50
        transition-transform duration-300 ease-in-out
        ${isMenuVisible ? 'translate-y-0' : 'translate-y-[120%]'}
      `}>
        
        {/* Hide Menu Handle (Optional visual cue to push it down) */}
        <div className="flex justify-center -mb-2">
          <button 
            onClick={() => setIsMenuVisible(false)}
            className="p-1 text-gray-500 hover:text-white bg-abyss/50 rounded-full backdrop-blur-sm"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar - Expands on interaction */}
        <div className={`
          transition-all duration-300 ease-out 
          ${isSearchExpanded ? 'transform -translate-y-2' : ''}
        `}>
          <div 
            onClick={() => setIsSearchExpanded(true)}
            className={`${isSearchExpanded ? 'shadow-2xl' : 'shadow-lg'}`}
          >
            <SearchBar 
              onSearch={handleSearchWrapper} 
              isLoading={isLoading} 
              placeholder="Search topic..."
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className={`
          grid grid-cols-5 gap-2 
          transition-all duration-300 ease-out
          ${isSearchExpanded ? 'opacity-0 translate-y-10 pointer-events-none h-0' : 'opacity-100 h-12'}
        `}>
          
          {/* Node Outline Toggle */}
          <button 
            onClick={() => setActiveSheet(activeSheet === 'outline' ? 'none' : 'outline')}
            className={`col-span-1 flex items-center justify-center bg-abyss-surface/90 backdrop-blur-xl border rounded-xl transition-all ${activeSheet === 'outline' ? 'border-brand-primary text-brand-primary' : 'border-abyss-border text-gray-400'}`}
          >
            <ListBulletIcon className="w-6 h-6" />
          </button>

          {/* Graph Stats */}
          <button 
            onClick={onOpenStats}
            className="col-span-3 flex items-center justify-center gap-2 bg-brand-primary/10 backdrop-blur-xl border border-brand-primary/30 text-brand-glow rounded-xl font-medium text-sm"
          >
            <ChartBarIcon className="w-5 h-5" />
            <span>Graph Stats</span>
          </button>

          {/* Tools Toggle */}
          <button 
            onClick={() => setActiveSheet(activeSheet === 'tools' ? 'none' : 'tools')}
            className={`col-span-1 flex items-center justify-center bg-abyss-surface/90 backdrop-blur-xl border rounded-xl transition-all ${activeSheet === 'tools' ? 'border-brand-primary text-brand-primary' : 'border-abyss-border text-gray-400'}`}
          >
            <Cog6ToothIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* --- Node Outline Sheet --- */}
      <div className={`
        pointer-events-auto absolute bottom-0 left-0 w-full 
        bg-abyss-surface/95 backdrop-blur-2xl border-t border-abyss-border 
        rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out z-40
        flex flex-col
        ${activeSheet === 'outline' ? 'translate-y-0' : 'translate-y-full'}
      `} style={{ height: '60vh' }}>
        
        <div className="flex items-center justify-between p-4 border-b border-abyss-border">
          <h3 className="font-bold text-white ml-2">Exploration Path</h3>
          <button onClick={() => setActiveSheet('none')} className="p-2 text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <NodeOutline 
            isOpen={true} 
            onToggle={() => {}} 
            onNodeClick={(id) => {
              onNodeClick(id);
              setActiveSheet('none');
              // Optional: Hide menu when selecting a node to clear view?
              // setIsMenuVisible(false); 
            }} 
          />
        </div>
      </div>

      {/* --- Tools Sheet --- */}
      <div className={`
        pointer-events-auto absolute bottom-0 left-0 w-full 
        bg-abyss-surface/95 backdrop-blur-2xl border-t border-abyss-border 
        rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out z-40
        ${activeSheet === 'tools' ? 'translate-y-0' : 'translate-y-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-abyss-border">
          <h3 className="font-bold text-white ml-2">Graph Tools</h3>
          <button onClick={() => setActiveSheet('none')} className="p-2 text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2 flex justify-center mb-2">
            <QualityToggle />
          </div>

          <button onClick={onRefreshApp} className="flex flex-col items-center justify-center gap-2 p-4 bg-abyss-hover/50 rounded-xl border border-abyss-border active:scale-95 transition-transform">
            <ArrowPathIcon className="w-6 h-6 text-brand-glow" />
            <span className="text-xs text-gray-300">Refresh App</span>
          </button>

          <button onClick={onRefreshEdges} className="flex flex-col items-center justify-center gap-2 p-4 bg-abyss-hover/50 rounded-xl border border-abyss-border active:scale-95 transition-transform">
            <svg className="w-6 h-6 text-brand-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-gray-300">Regen Edges</span>
          </button>

          <button onClick={handleSave} disabled={nodes.length === 0} className="flex flex-col items-center justify-center gap-2 p-4 bg-abyss-hover/50 rounded-xl border border-abyss-border active:scale-95 transition-transform disabled:opacity-50">
            <ArrowDownTrayIcon className="w-6 h-6 text-emerald-400" />
            <span className="text-xs text-gray-300">Save Graph</span>
          </button>

          <button onClick={handleLoad} className="flex flex-col items-center justify-center gap-2 p-4 bg-abyss-hover/50 rounded-xl border border-abyss-border active:scale-95 transition-transform">
            <ArrowUpTrayIcon className="w-6 h-6 text-blue-400" />
            <span className="text-xs text-gray-300">Load Graph</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".json" 
            className="hidden" 
          />
        </div>
        <div className="h-8" /> {/* Safe area for swipe bar */}
      </div>

    </div>
  );
}