// frontend/src/components/GraphCanvas2D.tsx
import { useEffect, memo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { useGraphStore } from '../stores/graphStore';
import '@react-sigma/core/lib/react-sigma.css';

// --- Synchronizes Zustand Store -> Graphology ---
const GraphDataSynchronizer = () => {
  const loadGraph = useLoadGraph();
  const { nodes, edges } = useGraphStore();
  const sigma = useSigma();

  useEffect(() => {
    const graph = new Graph();

    nodes.forEach((node) => {
      // Depth-based coloring (matching 3D theme)
      const colors = ['#F59E0B', '#A855F7', '#3B82F6', '#06B6D4', '#10B981', '#10B981', '#10B981'];
      const color = colors[Math.min(node.depth, 6)];
      const size = node.depth === 0 ? 15 : 5 + (Math.random() * 5); // Slight random size variation

      graph.addNode(node.id, {
        label: node.label,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: size,
        color: color,
        nodeData: node 
      });
    });

    edges.forEach((edge) => {
      const source = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const target = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;

      if (graph.hasNode(source) && graph.hasNode(target) && !graph.hasEdge(source, target)) {
        graph.addEdge(source, target, {
          color: '#4c1d95',
          size: 2
        });
      }
    });

    loadGraph(graph);
    sigma.refresh();
  }, [nodes, edges, loadGraph, sigma]);

  return null;
};

// --- Physics Engine (ForceAtlas2) ---
const ForceLayout = () => {
  const { start, stop, kill } = useWorkerLayoutForceAtlas2({
    settings: {
      slowDown: 10,
      gravity: 1, 
      edgeWeightInfluence: 1,
      strongGravityMode: false,
    },
  });

  useEffect(() => {
    start();
    return () => {
      stop();
      kill();
    };
  }, [start, stop, kill]);

  return null;
};

// --- Interaction Handler ---
const GraphEvents = ({ onNodeClick }: { onNodeClick: (id: string) => void }) => {
  const registerEvents = useRegisterEvents();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        event.event.original.stopPropagation();
        onNodeClick(event.node);
      },
      enterNode: () => { document.body.style.cursor = 'pointer'; },
      leaveNode: () => { document.body.style.cursor = 'default'; },
    });
  }, [registerEvents, onNodeClick]);

  return null;
};

interface GraphCanvas2DProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphCanvas2D = memo(({ onNodeClick }: GraphCanvas2DProps) => {
  return (
    <div className="w-full h-full bg-abyss">
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={{
          labelColor: { color: '#FFFFFF' },
          labelRenderedSizeThreshold: 6,
          labelFont: "Inter, sans-serif",
          zIndex: true,
          renderEdgeLabels: false,
          defaultEdgeType: 'line',
          defaultNodeType: 'circle',
          hideEdgesOnMove: true,
          hideLabelsOnMove: true,
        }}
      >
        <GraphDataSynchronizer />
        <ForceLayout />
        <GraphEvents onNodeClick={onNodeClick} />
      </SigmaContainer>
    </div>
  );
});