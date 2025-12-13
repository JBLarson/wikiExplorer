//frontend/src/components/graph2d/GraphInteractionLayer.tsx

import { useEffect, useState } from 'react';
import { useRegisterEvents, useSigma } from '@react-sigma/core';

interface InteractionProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphInteractionLayer = ({ onNodeClick }: InteractionProps) => {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredNeighbors, setHoveredNeighbors] = useState<Set<string>>(new Set());

  // --- 1. Event Listeners ---
  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        if (event.event && event.event.original) {
          event.event.original.stopPropagation();
        }
        onNodeClick(event.node);
      },
      enterNode: (event) => {
        document.body.style.cursor = 'pointer';
        setHoveredNode(event.node);
        
        const graph = sigma.getGraph();
        const neighbors = new Set(graph.neighbors(event.node));
        setHoveredNeighbors(neighbors);
      },
      leaveNode: (event) => {
        document.body.style.cursor = 'default';
        setHoveredNode(null);
        setHoveredNeighbors(new Set());
      },
    });
  }, [registerEvents, onNodeClick, sigma]);

  // --- 2. High-Contrast Reducers ---
  useEffect(() => {
    const graph = sigma.getGraph();

    // Node Reducer: Focus Mode with Context-Aware Text Color
    sigma.setSetting('nodeReducer', (node, data) => {
      if (!hoveredNode) return data; // Normal State

      // CASE A: The Node Under the Cursor (White Card Background)
      if (node === hoveredNode) {
        return {
          ...data,
          zIndex: 10,
          // CRITICAL FIX: Pass a string hex code, NOT an object.
          // This creates #000000 Text on the White Hover Card.
          labelColor: "#000000",
          forceLabel: true,
        };
      }

      // CASE B: The Neighboring Nodes (Dark Canvas Background)
      if (hoveredNeighbors.has(node)) {
        return { 
          ...data, 
          zIndex: 9, 
          // Keep these White to pop against the dark void
          labelColor: "#FFFFFF",
          forceLabel: true, 
        };
      }

      // CASE C: Background Noise
      return { 
        ...data, 
        zIndex: 1, 
        color: '#1E293B', // Dark Slate (faded)
        label: '',        // Hide label completely
      };
    });

    // Edge Reducer: Connection Tracing
    sigma.setSetting('edgeReducer', (edge, data) => {
      if (!hoveredNode) return data;

      const hasSource = graph.source(edge) === hoveredNode;
      const hasTarget = graph.target(edge) === hoveredNode;

      if (hasSource || hasTarget) {
        return { 
          ...data, 
          color: '#F59E0B', // Amber (High Contrast)
          zIndex: 10, 
          size: 3 
        }; 
      }

      return { ...data, hidden: true, color: '#000000', size: 0 }; 
    });

    sigma.refresh();

    return () => {
        sigma.setSetting('nodeReducer', null);
        sigma.setSetting('edgeReducer', null);
    };
  }, [hoveredNode, hoveredNeighbors, sigma]);

  return null;
};