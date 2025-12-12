// frontend/src/components/QualityToggle.tsx
import { CubeIcon, Square2StackIcon } from '@heroicons/react/24/outline';
import { useGraphStore } from '../stores/graphStore';

export function QualityToggle() {
  const { graphicsQuality, setGraphicsQuality } = useGraphStore();

  const toggle = () => {
    setGraphicsQuality(graphicsQuality === 'high' ? 'low' : 'high');
  };

  const is3D = graphicsQuality === 'high';

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-2 px-3 h-10 
        backdrop-blur-xl border rounded-xl shadow-glass transition-all duration-200 group
        ${is3D 
          ? 'bg-abyss-surface/90 border-abyss-border hover:border-brand-primary/50' 
          : 'bg-brand-primary/10 border-brand-primary/50 text-brand-glow'
        }
      `}
      title={is3D ? "Switch to 2D Layout" : "Switch to 3D Galaxy"}
    >
      {is3D ? (
        <>
          <CubeIcon className="w-5 h-5 text-brand-glow" />
          <span className="text-sm font-medium text-gray-300 group-hover:text-white hidden md:block">
            3D Galaxy
          </span>
        </>
      ) : (
        <>
          <Square2StackIcon className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-100 hidden md:block">
            2D Graph
          </span>
        </>
      )}
    </button>
  );
}