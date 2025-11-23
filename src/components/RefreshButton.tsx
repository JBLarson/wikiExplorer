import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface RefreshButtonProps {
  onRefresh: () => void;
}

export function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = () => {
    setIsSpinning(true);
    onRefresh();
    
    // Stop spinning after animation
    setTimeout(() => setIsSpinning(false), 1000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isSpinning}
      className="flex items-center justify-center w-10 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group disabled:opacity-50"
      title="Hard Refresh (Clear cache & reload)"
    >
      <ArrowPathIcon 
        className={`w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors ${
          isSpinning ? 'animate-spin' : ''
        }`}
      />
    </button>
  );
}