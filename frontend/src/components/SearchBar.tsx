// frontend/src/components/SearchBar.tsx
// @refresh reset
import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string, isPrivate: boolean) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Explore Wikipedia', isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
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
      onSearch(query.trim(), isPrivate);
      inputRef.current?.blur();
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative w-full group z-50 max-w-4xl mx-auto flex items-center gap-3">
      <div className={`
        relative flex items-center flex-1
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

      {/* Private Search Checkbox - Inline */}
      <button
        type="button"
        onClick={() => setIsPrivate(!isPrivate)}
        className={`
          flex items-center justify-center gap-2 h-14 px-4
          bg-abyss-surface/90 backdrop-blur-xl
          border rounded-2xl transition-all duration-300
          hover:bg-abyss-hover shadow-glass
          ${isPrivate 
            ? 'border-brand-primary/50 shadow-glow ring-1 ring-brand-primary/20' 
            : 'border-abyss-border'
          }
        `}
      >
        <LockClosedIcon className={`w-5 h-5 transition-colors ${isPrivate ? 'text-brand-glow' : 'text-gray-500'}`} />
        <span className={`hidden lg:block text-sm font-medium transition-colors ${isPrivate ? 'text-brand-glow' : 'text-gray-400'}`}>
          Private
        </span>
      </button>
    </form>
  );
}