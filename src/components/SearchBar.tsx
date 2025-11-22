import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Explore the graph...', isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };
  
  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full group z-50">
      {/* Search Icon */}
      <div className={`
        absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300
        ${isFocused ? 'text-brand-accent' : 'text-gray-500'}
      `}>
        <MagnifyingGlassIcon className="w-5 h-5" />
      </div>
      
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={isLoading}
        className={`
          w-full h-12 pl-12 pr-24 py-3
          bg-abyss-surface border rounded-xl
          text-gray-100 placeholder-gray-600
          transition-all duration-300 ease-out
          focus:outline-none
          ${isFocused 
            ? 'border-brand-accent/50 ring-4 ring-brand-accent/10 shadow-glow' 
            : 'border-abyss-border hover:border-abyss-highlight'
          }
          ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      />

      {/* Clear Button */}
      {query && !isLoading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-brand-accent border-t-transparentKf rounded-fullRK animate-spin" />
        </div>
      )}
      
      {/* Keyboard Shortcut Hint */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <kbd className={`
          px-2 py-1 text-xs font-mono font-semibold
          bg-abyss-border text-gray-400 rounded
          border border-abyss-highlight
          transition-all duration-200
          ${isFocused ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}>
          /
        </kbd>
      </div>
    </form>
  );
}