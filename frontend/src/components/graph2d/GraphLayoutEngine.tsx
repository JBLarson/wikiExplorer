import { useEffect } from 'react';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import { useGraphStore } from '../../stores/graphStore';
import { LAYOUT_SETTINGS } from './GraphSettings';

export const GraphLayoutEngine = () => {
  const { nodes, edges } = useGraphStore();
  
  // FIXED: Pass settings to the hook, not the start function
  const { start, stop, kill } = useWorkerLayoutForceAtlas2({
    settings: LAYOUT_SETTINGS.settings
  });

  useEffect(() => {
    // Safety check: Don't run physics on empty graphs
    if (nodes.length === 0) return;

    // 1. Start Continuous Simulation (Worker Thread)
    // FIXED: start() takes 0 arguments now
    start();

    // 2. Auto-Stop Strategy
    // We stop the simulation after 2 seconds to allow interaction and save battery.
    const timer = setTimeout(() => {
      stop();
    }, 2000);

    return () => {
      clearTimeout(timer);
      // Kill the worker entirely when unmounting to prevent memory leaks
      kill();
    };
  }, [nodes.length, edges.length, start, stop, kill]);

  return null;
};