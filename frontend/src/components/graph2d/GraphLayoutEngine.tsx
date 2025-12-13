import { useEffect } from 'react';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import { useGraphStore } from '../../stores/graphStore';
import { LAYOUT_SETTINGS } from './GraphSettings';

export const GraphLayoutEngine = () => {
  const { nodes, edges } = useGraphStore();
  
  // Initialize the worker hook
  const { start, stop } = useWorkerLayoutForceAtlas2({
    settings: LAYOUT_SETTINGS.settings
  });

  useEffect(() => {
    // Safety check: Don't run physics on empty graphs
    if (nodes.length === 0) return;

    // 1. Start Continuous Simulation
    // This runs whenever nodes/edges update to organize the new structure
    start();

    // 2. Auto-Stop Strategy
    // We stop the simulation after 2 seconds to allow interaction and save battery.
    const timer = setTimeout(() => {
      stop();
    }, 2000);

    return () => {
      clearTimeout(timer);
      // CRITICAL FIX: Only stop() the simulation on updates. 
      // Never call kill() here, or the worker becomes permanently unusable 
      // for subsequent renders (like node expansion).
      stop();
    };
  }, [nodes.length, edges.length, start, stop]);

  return null;
};