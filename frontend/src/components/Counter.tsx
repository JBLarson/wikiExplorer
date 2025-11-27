// frontend/src/components/Counter.tsx
import { useGraphStore } from '../stores/graphStore';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export function Counter() {
  const { nodes, edges } = useGraphStore();
  
  return (
    <div className="flex items-center gap-2 md:gap-4 pointer-events-auto">
      <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border rounded-lg md:rounded-xl shadow-glass">
        <ChartBarIcon className="w-3 h-3 md:w-4 md:h-4 text-brand-glow hidden md:block" />
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">N</span>
            <span className="text-sm md:text-lg font-bold text-white tabular-nums">{nodes.length}</span>
          </div>
          <div className="w-px h-3 md:h-4 bg-abyss-border" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider">E</span>
            <span className="text-sm md:text-lg font-bold text-white tabular-nums">{edges.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}