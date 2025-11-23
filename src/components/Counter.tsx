import { useGraphStore } from '../stores/graphStore';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export function Counter() {
  const { nodes, edges } = useGraphStore();

  return (
    <div className="flex items-center gap-4 pointer-events-auto">
      <div className="flex items-center gap-2 px-4 py-2 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border rounded-xl shadow-glass">
        <ChartBarIcon className="w-4 h-4 text-brand-glow" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Nodes</span>
            <span className="text-lg font-bold text-white tabular-nums">{nodes.length}</span>
          </div>
          <div className="w-px h-4 bg-abyss-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Edges</span>
            <span className="text-lg font-bold text-white tabular-nums">{edges.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}