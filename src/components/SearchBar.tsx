import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Search the knowledge graph...', isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') inputRef.current?.blur();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      inputRef.current?.blur();
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full group z-50 max-w-2xl mx-auto">
      <div className={`
        relative flex items-center
        bg-abyss-surface/90 backdrop-blur-xl
        border transition-all duration-300 ease-out rounded-2xl
        ${isFocused 
          ? 'border-brand-primary/50 shadow-glow ring-1 ring-brand-primary/20' 
          : 'border-abyss-border shadow-glass'
        }
      `}>
        {/* Icon */}
        <div className="pl-4 text-gray-500">
          {isLoading ? (
            <div className="w-5 h-5 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
          ) : (
            <MagnifyingGlassIcon className={`w-5 h-5 transition-colors ${isFocused ? 'text-brand-glow' : ''}`} />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={isLoading}
          className="
            w-full h-14 pl-3 pr-12
            bg-transparent border-none outline-none
            text-gray-100 placeholder-gray-600
            text-base font-medium
          "
        />

        {/* Right Actions */}
        <div className="absolute right-4 flex items-center gap-2">
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
          
          <div className={`
            hidden md:flex items-center justify-center h-6 px-2
            bg-abyss-border rounded border border-abyss-highlight
            text-xs text-gray-500 font-mono transition-opacity duration-200
            ${isFocused ? 'opacity-0' : 'opacity-100'}
          `}>
            /
          </div>
        </div>
      </div>
    </form>
  );
}