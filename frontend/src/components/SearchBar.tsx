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
      // Only capture slash if not already typing
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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
    <form onSubmit={handleSubmit} className="relative w-full group z-50 flex items-center gap-2 md:gap-3">
      <div className={`
        relative flex items-center flex-1
        bg-abyss-surface/90 backdrop-blur-xl
        border transition-all duration-300 ease-out rounded-xl md:rounded-2xl
        ${isFocused 
          ? 'border-brand-primary/50 shadow-glow ring-1 ring-brand-primary/20' 
          : 'border-abyss-border shadow-glass'
        }
      `}>
        {/* Icon */}
        <div className="pl-3 md:pl-4 text-gray-500">
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
            w-full h-12 md:h-14 pl-2 md:pl-3 pr-10
            bg-transparent border-none outline-none
            text-gray-100 placeholder-gray-500
            text-sm md:text-base font-medium
          "
        />

        {/* Clear Button */}
        {query && !isLoading && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors p-1"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Private Search Checkbox */}
      <button
        type="button"
        onClick={() => setIsPrivate(!isPrivate)}
        className={`
          flex items-center justify-center gap-2 h-12 md:h-14 w-12 md:w-auto md:px-4
          bg-abyss-surface/90 backdrop-blur-xl
          border rounded-xl md:rounded-2xl transition-all duration-300
          hover:bg-abyss-hover shadow-glass
          ${isPrivate 
            ? 'border-brand-primary/50 shadow-glow text-brand-glow' 
            : 'border-abyss-border text-gray-500'
          }
        `}
        title="Toggle Private Search"
      >
        <LockClosedIcon className="w-5 h-5" />
        <span className="hidden md:block text-sm font-medium">
          Private
        </span>
      </button>
    </form>
  );
}