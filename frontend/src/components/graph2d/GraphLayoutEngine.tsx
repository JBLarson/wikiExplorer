//frontend/src/components/graph2d/GraphLayoutEngine.tsx
import { useEffect } from 'react';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import { useGraphStore } from '../../stores/graphStore';
import { LAYOUT_SETTINGS } from './GraphSettings';

export const GraphLayoutEngine = () => {
  const { nodes, edges } = useGraphStore();
  
  // Initialize worker with settings
  const { start, stop, kill } = useWorkerLayoutForceAtlas2({
    settings: LAYOUT_SETTINGS.settings
  });

  useEffect(() => {
    // Safety check
    if (nodes.length === 0) return;

    // 1. Start Simulation
    // The nodes spawn at (0,0) and this force pushes them outward
    start();

    // 2. Stabilization Timer
    // Runs physics for 2 seconds then freezes to save CPU/Battery
    const timer = setTimeout(() => {
      stop();
    }, 2000);

    return () => {
      clearTimeout(timer);
      stop(); // Stop simulation on unmount/update
      // Do NOT call kill() here, or re-expansion will fail
    };
  }, [nodes.length, edges.length, start, stop]);

  // Kill worker only when component fully unmounts (e.g. switching to 3D)
  useEffect(() => {
    return () => {
      kill();
    };
  }, [kill]);

  return null;
};