import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Explore Wikipedia...', isLoading = false }: SearchBarProps) {
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
    <form onSubmit={handleSubmit} className="relative w-full group">
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
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
          bg-white border-2 rounded-xl
          text-gray-900 placeholder-gray-400
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-4
          ${isFocused 
            ? 'border-purple-600 ring-purple-100 shadow-lg' 
            : 'border-gray-200 shadow-sm hover:border-gray-300'
          }
          ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      />

      {/* Clear Button */}
      {query && !isLoading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute right-20 top-1/2 -translate-y-1/2">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Keyboard Shortcut Hint */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <kbd className={`
          px-2.5 py-1.5 text-xs font-semibold
          bg-gray-100 border border-gray-300 rounded-md
          transition-all duration-200
          ${isFocused ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}>
          /
        </kbd>
      </div>
    </form>
  );
}
