import { ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState, useRef, useEffect } from 'react';

interface RefreshButtonProps {
  onRefreshApp: () => void;
  onRefreshEdges: () => void;
}

export function RefreshButton({ onRefreshApp, onRefreshEdges }: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRefreshApp = () => {
    setIsSpinning(true);
    setShowDropdown(false);
    onRefreshApp();
    
    // Stop spinning after animation
    setTimeout(() => setIsSpinning(false), 1000);
  };

  const handleRefreshEdges = () => {
    setIsSpinning(true);
    setShowDropdown(false);
    onRefreshEdges();
    
    // Stop spinning after animation
    setTimeout(() => setIsSpinning(false), 1000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isSpinning}
        className="flex items-center justify-center gap-1.5 px-3 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group disabled:opacity-50"
        title="Refresh options"
      >
        <ArrowPathIcon 
          className={`w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors ${
            isSpinning ? 'animate-spin' : ''
          }`}
        />
        <ChevronDownIcon className="w-3 h-3 text-gray-400 group-hover:text-brand-glow transition-colors" />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-abyss-surface border border-abyss-border rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          
          {/* Refresh App Option */}
          <button
            onClick={handleRefreshApp}
            className="w-full px-4 py-3 text-left hover:bg-abyss-hover transition-colors group flex items-start gap-3"
          >
            <ArrowPathIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white group-hover:text-brand-glow transition-colors">
                Refresh App
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Clear cache & reload page
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="h-px bg-abyss-border" />

          {/* Refresh Edges Option */}
          <button
            onClick={handleRefreshEdges}
            className="w-full px-4 py-3 text-left hover:bg-abyss-hover transition-colors group flex items-start gap-3"
          >
            <svg 
              className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors flex-shrink-0 mt-0.5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" 
              />
            </svg>
            <div>
              <div className="text-sm font-medium text-white group-hover:text-brand-glow transition-colors">
                Refresh Edges
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Regenerate connections only
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}