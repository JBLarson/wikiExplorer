import { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Custom Binocular Icon to match Heroicons style
function BinocularsIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={className}
    >
    <path strokeLinecap="round" strokeLinejoin="round"
    d="M3.75 5.25a1.5 1.5 0 0 1 1.5-1.5h2.25a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 0-.75.75v2.25a.75.75 0 0 1-1.5 0V5.25zm16.5 0a1.5 1.5 0 0 0-1.5-1.5h-2.25a.75.75 0 0 0 0 1.5h2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 0 1.5 0V5.25zm0 13.5a1.5 1.5 0 0 1-1.5 1.5h-2.25a.75.75 0 0 1 0-1.5h2.25a.75.75 0 0 0 .75-.75v-2.25a.75.75 0 0 1 1.5 0v2.25zm-16.5 0a1.5 1.5 0 0 0 1.5 1.5h2.25a.75.75 0 0 0 0-1.5H5.25a.75.75 0 0 1-.75-.75v-2.25a.75.75 0 0 0-1.5 0v2.25z" />    </svg>
  );
}

interface FindNodeProps {
  onNodeSelect: (nodeId: string) => void;
}

export function FindNode({ onNodeSelect }: FindNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { nodes } = useGraphStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter nodes based on query
  const filteredNodes = query.trim() 
    ? nodes.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 h-10 bg-abyss-surface/90 backdrop-blur-xl border ${isOpen ? 'border-brand-primary/50 text-brand-glow' : 'border-abyss-border text-gray-300'} hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group`}
        title="Find node in graph"
      >
        <BinocularsIcon className={`w-5 h-5 transition-colors ${isOpen ? 'text-brand-glow' : 'text-gray-400 group-hover:text-brand-glow'}`} />
        <span className={`text-sm font-medium transition-colors ${isOpen ? 'text-brand-glow' : 'group-hover:text-white'}`}>
          Find
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-abyss-surface border border-abyss-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in flex flex-col">
          <div className="p-3 border-b border-abyss-border flex items-center gap-2">
            <BinocularsIcon className="w-4 h-4 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to find node..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-600"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="text-gray-500 hover:text-white"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {query.trim() === '' ? (
              <div className="p-4 text-center text-xs text-gray-500">
                Type the name of a visible node
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No matching nodes found
              </div>
            ) : (
              <div className="py-1">
                {filteredNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-abyss-hover hover:text-white transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{node.label}</span>
                    <span className="text-[10px] text-gray-600 group-hover:text-gray-400 border border-gray-800 rounded px-1">
                      D{node.depth}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}