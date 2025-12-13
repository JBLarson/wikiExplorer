//frontend/src/components/graph2d/GraphCameraController.tsx

import { useEffect } from 'react';
import { useCamera, useSigma } from '@react-sigma/core';
import { useGraphStore } from '../../stores/graphStore';

export const GraphCameraController = () => {
  const { nodes } = useGraphStore();
  const sigma = useSigma();
  // FIXED: Destructure 'goto' instead of 'animate'
  // 'goto' is the correct method in the react-sigma hook for moving the camera
  const { goto } = useCamera();

  useEffect(() => {
    if (nodes.length === 0) return;

    // --- ZERO-DRIFT ANCHOR ---
    // Instead of calculating bounding boxes on a moving target (which causes drift),
    // we simply center the camera on (0,0) where the gravity center is.
    // The graph will explode OUTWARDS from this point.
    
    // We use a small timeout to ensure Sigma has processed the new graph data
    const timer = setTimeout(() => {
      // FIXED: Use 'goto' with the duration option to animate
      goto(
        { x: 0, y: 0, ratio: 1.0 }, 
        { duration: 400, easing: 'cubicInOut' }
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [nodes.length, sigma, goto]);

  return null;
};