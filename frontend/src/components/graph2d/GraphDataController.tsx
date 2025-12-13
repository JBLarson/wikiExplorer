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
    // --- FAANG-LEVEL HYGIENE ---
    // We do not trust the state. We rebuild the graph structure 
    // strictly from the semantic data, ignoring any previous 
    // rendering artifacts (x, y, type, color) that might be in the store.
    
    const graph = new Graph({ multi: false, type: 'directed' });

    // 1. Sanitize & Map Nodes
    nodes.forEach((node) => {
      const depthIndex = Math.min(node.depth, NODE_PALETTE.length - 1);
      const isRoot = node.id === rootNode;
      
      const baseSize = isRoot ? 30 : 8;
      const size = baseSize + (Math.min(node.expansionCount, 10) * 1.5);

      // Create a clean attribute object
      const attributes = {
        label: node.label,
        size: size,
        color: NODE_PALETTE[depthIndex] || DEFAULT_NODE_COLOR,
        
        // Anchor Strategy:
        // We reset positions to the singularity point.
        // This effectively "wipes" the physics cache.
        x: isRoot ? 0 : Math.cos(Math.random() * Math.PI * 2) * 10, 
        y: isRoot ? 0 : Math.sin(Math.random() * Math.PI * 2) * 10,
        
        // Logical metadata only
        fixed: isRoot,
        nodeType: isRoot ? 'root' : 'child',
        zIndex: isRoot ? 10 : 1,
        
        // CRITICAL: We DO NOT pass 'type'.
        // This forces Sigma to use its internal default renderer.
        // If 'type': 'circle' exists in your JSON, it dies here.
      };

      graph.addNode(node.id, attributes);
    });

    // 2. Map Edges
    edges.forEach((edge) => {
      const sourceId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const targetId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;

      if (graph.hasNode(sourceId) && graph.hasNode(targetId)) {
        if (!graph.hasEdge(sourceId, targetId)) {
          graph.addEdge(sourceId, targetId, {
            color: '#4c1d95',
            size: 2,
            type: 'arrow', // "arrow" is safe in standard Sigma
            weight: 1
          });
        }
      }
    });

    // 3. Nuclear Option: Wipe & Reload
    // This tells Sigma to discard everything and accept the new graph
    // as the absolute truth.
    loadGraph(graph);
    sigma.refresh();

  }, [nodes, edges, rootNode, loadGraph, sigma]);

  return null;
};