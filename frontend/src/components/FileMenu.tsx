import { useState, useRef, useEffect } from 'react';
import { 
  FolderIcon, 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon, 
  ChevronDownIcon 
} from '@heroicons/react/24/outline';
import { useGraphStore } from '../stores/graphStore';
import type { SavedGraph } from '../types';

interface FileMenuProps {
  onGraphLoad?: () => void;
  disabled?: boolean;
}

export function FileMenu({ onGraphLoad, disabled = false }: FileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [graphName, setGraphName] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { exportGraphToJSON, importGraphFromJSON, nodes, rootNode } = useGraphStore();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Save Logic ---
  const handleOpenSaveModal = () => {
    setIsOpen(false);
    const rootNodeData = nodes.find(n => n.id === rootNode);
    setGraphName(rootNodeData?.label || 'My Graph');
    setShowSaveModal(true);
  };

  const handleSave = () => {
    if (!graphName.trim()) return;
    exportGraphToJSON(graphName);
    setShowSaveModal(false);
    setGraphName('');
  };

  // --- Load Logic ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(false);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const savedGraph: SavedGraph = JSON.parse(content);
        importGraphFromJSON(savedGraph);
        onGraphLoad?.();
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
        console.error('Failed to load graph:', error);
        alert('Failed to load graph. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hidden Input for Loading */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-1.5 px-3 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group"
        title="File Operations"
      >
        <FolderIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
        <ChevronDownIcon className="w-3 h-3 text-gray-400 group-hover:text-brand-glow transition-colors" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-abyss-surface border border-abyss-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          
          {/* Save Option */}
          <button
            onClick={handleOpenSaveModal}
            disabled={disabled}
            className="w-full px-4 py-3 text-left hover:bg-abyss-hover transition-colors group flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
            <span className="text-sm font-medium text-white group-hover:text-brand-glow transition-colors">
              Save Graph
            </span>
          </button>

          <div className="h-px bg-abyss-border" />

          {/* Load Option */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 text-left hover:bg-abyss-hover transition-colors group flex items-center gap-3"
          >
            <ArrowUpTrayIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
            <span className="text-sm font-medium text-white group-hover:text-brand-glow transition-colors">
              Load Graph
            </span>
          </button>
        </div>
      )}

      {/* Save Modal (Embedded) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-abyss-border">
              <h2 className="text-xl font-bold text-white">Save Graph</h2>
              <p className="text-sm text-gray-400 mt-1">Export your graph as a JSON file</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Graph Name</label>
                <input
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  autoFocus
                  className="w-full px-4 py-2 bg-abyss border border-abyss-border rounded-xl text-white focus:outline-none focus:border-brand-primary/50 transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-abyss-border flex justify-end gap-3">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!graphName.trim()}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-glow text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}