import { ChartBarIcon } from '@heroicons/react/24/outline';

interface StatsButtonProps {
  onOpenStats: () => void;
  nodeCount: number;
}

export function StatsButton({ onOpenStats, nodeCount }: StatsButtonProps) {
  return (
    <button
      onClick={onOpenStats}
      disabled={nodeCount === 0}
      className="flex items-center gap-2 px-4 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
      title="View graph statistics"
    >
      <ChartBarIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
      <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
        Stats
      </span>
      {nodeCount > 0 && (
        <span className="ml-1 px-2 py-0.5 bg-brand-primary/20 text-brand-glow text-xs font-bold rounded-md">
          {nodeCount}
        </span>
      )}
    </button>
  );
}