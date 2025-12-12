// frontend/src/components/GraphCanvas2D.tsx
import { useEffect, memo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { useGraphStore } from '../stores/graphStore';

// --- SUB-COMPONENT: Data Synchronizer ---
const GraphDataSynchronizer = () => {
  const loadGraph = useLoadGraph();
  const { nodes, edges } = useGraphStore();
  const sigma = useSigma();

  useEffect(() => {
    const graph = new Graph();

    // Add Nodes
    nodes.forEach((node) => {
      const colors = ['#F59E0B', '#A855F7', '#3B82F6', '#06B6D4', '#10B981', '#10B981', '#10B981'];
      const color = colors[Math.min(node.depth, 6)];
      const size = node.depth === 0 ? 15 : 5 + (Math.random() * 5);

      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
          label: node.label,
          // Initialize with random positions to avoid layout issues
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: size,
          color: color,
          nodeData: node 
        });
      }
    });

    // Add Edges
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

// --- SUB-COMPONENT: Force Layout (Synchronous Main Thread) ---
const ForceLayout = () => {
  // CRITICAL FIX: The synchronous hook requires 'iterations' and returns 'assign'.
  // It does NOT use start/stop/kill like the worker version.
  const { assign } = useLayoutForceAtlas2({
    iterations: 100, // Run 100 physics ticks immediately
    settings: {
      slowDown: 10,
      gravity: 1, 
      edgeWeightInfluence: 1,
      strongGravityMode: false,
    },
  });

  useEffect(() => {
    // Apply the calculated layout positions to the graph
    assign();
  }, [assign]);

  return null;
};

// --- SUB-COMPONENT: Event Handler ---
const GraphEvents = ({ onNodeClick }: { onNodeClick: (id: string) => void }) => {
  const registerEvents = useRegisterEvents();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        event.event.original.stopPropagation();
        onNodeClick(event.node);
      },
      enterNode: () => {
        document.body.style.cursor = 'pointer';
      },
      leaveNode: () => {
        document.body.style.cursor = 'default';
      },
    });
  }, [registerEvents, onNodeClick]);

  return null;
};

interface GraphCanvas2DProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphCanvas2D = memo(({ onNodeClick }: GraphCanvas2DProps) => {
  return (
    // Explicit style ensures parent div has dimensions
    <div style={{ width: '100%', height: '100%', backgroundColor: '#02020B' }}>
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={{
          allowInvalidContainer: true, // Fixes "Container has no height" error
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