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

    // Node Reducer: Focus Mode
    sigma.setSetting('nodeReducer', (node, data) => {
      if (!hoveredNode) return data; // Normal State

      // Highlight Logic
      if (node === hoveredNode || hoveredNeighbors.has(node)) {
        return { 
          ...data, 
          zIndex: 10, 
          // Force Label Color to White for maximum contrast
          labelColor: { color: '#FFF000' },
          // Ensure label is visible
          forceLabel: true, 
        };
      }

      // Dim Logic (Ghosting)
      return { 
        ...data, 
        zIndex: 1, 
        color: '#1E293B', // Dark Slate (barely visible against black bg)
        label: '',        // Hide label completely to reduce noise
      };
    });

    // Edge Reducer: Connection Tracing
    sigma.setSetting('edgeReducer', (edge, data) => {
      if (!hoveredNode) return data;

      const hasSource = graph.source(edge) === hoveredNode;
      const hasTarget = graph.target(edge) === hoveredNode;

      // If connected to hover target, make it pop
      if (hasSource || hasTarget) {
        return { 
          ...data, 
          color: '#F59E0B', // Amber (High Contrast)
          zIndex: 10, 
          size: 3 
        }; 
      }

      // Otherwise hide it
      return { ...data, hidden: true }; 
    });

    sigma.refresh();

    return () => {
        sigma.setSetting('nodeReducer', null);
        sigma.setSetting('edgeReducer', null);
    };
  }, [hoveredNode, hoveredNeighbors, sigma]);

  return null;
};