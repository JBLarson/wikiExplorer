import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useRef } from 'react';
import { useGraphStore } from '../stores/graphStore';
import type { SavedGraph } from '../types';

interface LoadGraphButtonProps {
  onLoad?: () => void;
}

export function LoadGraphButton({ onLoad }: LoadGraphButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importGraphFromJSON } = useGraphStore();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const savedGraph: SavedGraph = JSON.parse(content);
        
        // Import the graph
        importGraphFromJSON(savedGraph);
        
        // Notify parent
        onLoad?.();
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Failed to load graph:', error);
        alert('Failed to load graph. Please check the file format.');
      }
    };
    
    reader.onerror = () => {
      alert('Failed to read file.');
    };
    
    reader.readAsText(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group"
        title="Load graph from JSON"
      >
        <ArrowUpTrayIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
          Load
        </span>
      </button>
    </>
  );
}