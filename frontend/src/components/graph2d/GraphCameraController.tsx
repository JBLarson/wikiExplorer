//frontend/src/components/graph2d/GraphCameraController.tsx

import { useEffect } from 'react';
import { useCamera, useSigma } from '@react-sigma/core';
import { useGraphStore } from '../../stores/graphStore';

export const GraphCameraController = () => {
  const { nodes } = useGraphStore();
  const sigma = useSigma();
  const { goto } = useCamera();

  useEffect(() => {
    if (nodes.length === 0) return;

    // --- ZERO-DRIFT ANCHOR ---
    // Since the Root Node is now physically fixed at (0,0) in the DataController,
    // we can confidently lock the camera to (0,0) without calculating bounding boxes.
    // The graph grows radially around this point.
    
    // We use a small timeout to ensure Sigma has processed the new graph data
    const timer = setTimeout(() => {
      goto(
        { x: 0, y: 0, ratio: 1.0 }, 
        { duration: 400, easing: 'cubicInOut' }
      );
    }, 50);

    return () => clearTimeout(timer);
  }, [nodes.length, sigma, goto]);

  return null;
};