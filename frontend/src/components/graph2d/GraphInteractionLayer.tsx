import { useEffect, useState } from 'react';
import { useRegisterEvents, useSigma } from '@react-sigma/core';
import { useGraphStore } from '../../stores/graphStore';

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
        
        // Find neighbors efficiently using Sigma's graph instance
        const graph = sigma.getGraph();
        const neighbors = new Set(graph.neighbors(event.node));
        setHoveredNeighbors(neighbors);
      },
      leaveNode: () => {
        document.body.style.cursor = 'default';
        setHoveredNode(null);
        setHoveredNeighbors(new Set());
      },
    });
  }, [registerEvents, onNodeClick, sigma]);

  // --- 2. Visual Reducers (The "Juice") ---
  useEffect(() => {
    const graph = sigma.getGraph();

    // Node Reducer: Dim nodes that aren't highlighted
    sigma.setSetting('nodeReducer', (node, data) => {
      if (!hoveredNode) return data; // Default state

      // If this is the hovered node or a neighbor, keep it bright
      if (node === hoveredNode || hoveredNeighbors.has(node)) {
        return { 
          ...data, 
          zIndex: 10, 
          label: data.label // Force show label
        };
      }

      // Otherwise, ghost it
      return { 
        ...data, 
        zIndex: 1, 
        color: '#334155', // Dark slate (dimmed)
        label: '' // Hide label to reduce noise
      };
    });

    // Edge Reducer: Hide irrelevant edges
    sigma.setSetting('edgeReducer', (edge, data) => {
      if (!hoveredNode) return data;

      const hasSource = graph.source(edge) === hoveredNode;
      const hasTarget = graph.target(edge) === hoveredNode;

      if (hasSource || hasTarget) {
        return { ...data, color: '#F59E0B', zIndex: 10, size: 3 }; // Highlight connection
      }

      return { ...data, color: '#1E293B', zIndex: 1, hidden: true }; // Hide others
    });

    // Refresh render
    sigma.refresh();

    // Cleanup
    return () => {
        sigma.setSetting('nodeReducer', null);
        sigma.setSetting('edgeReducer', null);
    };
  }, [hoveredNode, hoveredNeighbors, sigma]);

  return null;
};