//frontend/src/components/graph2d/GraphDataController.tsx


import { useEffect } from 'react';
import { useLoadGraph, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import { useGraphStore } from '../../stores/graphStore';
import { NODE_PALETTE, DEFAULT_NODE_COLOR } from './GraphSettings';

export const GraphDataController = () => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const { nodes, edges, rootNode } = useGraphStore();

  useEffect(() => {
    // 1. Create fresh graph instance (Single Source of Truth)
    const graph = new Graph({ multi: false, type: 'directed' });

    // 2. Map Nodes
    nodes.forEach((node) => {
      const depthIndex = Math.min(node.depth, NODE_PALETTE.length - 1);
      const isRoot = node.id === rootNode; // Identify Root
      
      // Visual Size Calculation
      // Root is massive (30), children scale based on connectivity
      const baseSize = isRoot ? 30 : 8;
      const size = baseSize + (Math.min(node.expansionCount, 10) * 1.5);

      graph.addNode(node.id, {
        label: node.label,
        size: size,
        color: NODE_PALETTE[depthIndex] || DEFAULT_NODE_COLOR,
        
        // --- ANCHOR STRATEGY ---
        // Root Node: Locked strictly to (0,0). It effectively becomes the "Sun".
        // Other Nodes: Spawn in a micro-ring around it.
        x: isRoot ? 0 : Math.cos(Math.random() * Math.PI * 2) * 10, 
        y: isRoot ? 0 : Math.sin(Math.random() * Math.PI * 2) * 10,
        
        // This tells the LayoutEngine (ForceAtlas2) to IGNORE physics for the root
        // keeping it permanently centered.
        fixed: isRoot, 
        
        // Metadata for reducers
        nodeType: isRoot ? 'root' : 'child',
        zIndex: isRoot ? 10 : 1
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
            type: 'arrow', // Directional arrows for better UX
            weight: 1
          });
        }
      }
    });

    // 4. Hydrate & Refresh
    loadGraph(graph);
    sigma.refresh();

  }, [nodes, edges, rootNode, loadGraph, sigma]);

  return null;
};