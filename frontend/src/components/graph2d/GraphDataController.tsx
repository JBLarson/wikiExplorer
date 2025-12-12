//frontend/src/components/graph2d/GraphDataController.tsx

import { useEffect } from 'react';
import { useLoadGraph, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import { useGraphStore } from '../../stores/graphStore';
import { NODE_PALETTE, DEFAULT_NODE_COLOR } from './GraphSettings';

export const GraphDataController = () => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const { nodes, edges } = useGraphStore();

  useEffect(() => {
    // We create a fresh graph instance for every major update to ensure
    // absolute synchronization with the "JSON Source of Truth" (the Store).
    // In a production app with 10k+ nodes, we would use graphology's 
    // `import` method, but for <1000 nodes, rebuilding is safer and instant.
    
    const graph = new Graph({ multi: false, type: 'directed' });

    // 1. Process Nodes
    // We map the store's data model to visual attributes required by Sigma
    nodes.forEach((node) => {
      const depthIndex = Math.min(node.depth, NODE_PALETTE.length - 1);
      
      // Visual Calculation logic
      const baseSize = node.depth === 0 ? 20 : 6;
      // Nodes grow slightly as they gain connections (expansions)
      const size = baseSize + (Math.min(node.expansionCount, 5) * 2);

      graph.addNode(node.id, {
        label: node.label,
        size: size,
        color: NODE_PALETTE[depthIndex] || DEFAULT_NODE_COLOR,
        // We initialize positions randomly to prevent the "singularity" crash
        // The layout engine will fix this immediately
        x: Math.random() * 100, 
        y: Math.random() * 100,
        // Metadata for events
        nodeType: node.depth === 0 ? 'root' : 'child'
      });
    });

    // 2. Process Edges
    // We deduplicate edges implicitly by checking graph.hasEdge
    edges.forEach((edge) => {
      // Robust type checking for source/target which might be objects in some stores
      const sourceId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const targetId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;

      // Integrity Check: Do both nodes exist in our current snapshot?
      if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
        // Prevent duplicate edges which crash WebGL renderers
        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId, {
            color: '#4c1d95', // Brand primary (dark)
            size: 2,
            type: 'line',
            weight: edge.score || 1 // For ForceAtlas2 attraction
          });
        }
      }
    });

    // 3. Hydrate Sigma
    loadGraph(graph);
    
    // 4. Force a re-render to clear artifacts
    sigma.refresh();

  }, [nodes, edges, loadGraph, sigma]);

  return null;
};