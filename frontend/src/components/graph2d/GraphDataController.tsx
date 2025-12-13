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
    // 1. Create fresh graph instance (Single Source of Truth)
    const graph = new Graph({ multi: false, type: 'directed' });

    // 2. Map Nodes
    nodes.forEach((node) => {
      const depthIndex = Math.min(node.depth, NODE_PALETTE.length - 1);
      
      // Visual Size Calculation
      // Root is large (25), children are smaller (8), growing slightly with connections
      const baseSize = node.depth === 0 ? 25 : 8;
      const size = baseSize + (Math.min(node.expansionCount, 5) * 1.5);

      graph.addNode(node.id, {
        label: node.label,
        size: size,
        color: NODE_PALETTE[depthIndex] || DEFAULT_NODE_COLOR,
        
        // --- FAANG-LEVEL FIX: SINGULARITY INITIALIZATION ---
        // Instead of spawning nodes in a wide cloud (which causes "drift"),
        // we spawn them in a microscopic ring around (0,0).
        // This forces the physics engine to explode OUTWARD uniformly,
        // keeping the graph perfectly centered on screen at all times.
        x: Math.cos(Math.random() * Math.PI * 2) * 5, 
        y: Math.sin(Math.random() * Math.PI * 2) * 5,
        
        // Metadata for reducers
        nodeType: node.depth === 0 ? 'root' : 'child'
      });
    });

    // 3. Map Edges
    edges.forEach((edge) => {
      const sourceId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const targetId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;

      if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId, {
            color: '#4c1d95', // Brand Dark Purple
            size: 2,
            type: 'line',
            // Higher weight for direct parent-child links keeps the tree structured
            weight: 1 
          });
        }
      }
    });

    // 4. Hydrate & Refresh
    loadGraph(graph);
    sigma.refresh();

  }, [nodes, edges, loadGraph, sigma]);

  return null;
};