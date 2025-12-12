// frontend/src/components/GraphCanvas2D.tsx
import { useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import { useLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import Graph from 'graphology';
import { useGraphStore } from '../stores/graphStore';
import '@react-sigma/core/lib/react-sigma.min.css';

// --- SUB-COMPONENT: Data Synchronizer ---
const GraphDataSynchronizer = () => {
  const loadGraph = useLoadGraph();
  const { nodes, edges } = useGraphStore();
  const sigma = useSigma();
  const { positions, assign: assignLayout } = useLayoutForceAtlas2();

  useEffect(() => {
    // 1. Create a fresh Graphology instance to avoid mutating the global store
    const graph = new Graph();

    // 2. Add Nodes (Mapped to Sigma format)
    nodes.forEach((node) => {
      // Determine color based on depth
      const colors = ['#F59E0B', '#A855F7', '#3B82F6', '#06B6D4', '#10B981', '#10B981', '#10B981'];
      const color = colors[Math.min(node.depth, 6)] || '#9CA3AF';
      const size = node.depth === 0 ? 15 : 5 + (node.expansionCount * 2);

      if (!graph.hasNode(node.id)) {
        graph.addNode(node.id, {
          label: node.label,
          // Random initial positions to help ForceAtlas start
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: size,
          color: color,
          // Store original data if needed for events
          nodeData: { ...node } 
        });
      }
    });

    // 3. Add Edges
    edges.forEach((edge) => {
      const source = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
      const target = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;

      if (graph.hasNode(source) && graph.hasNode(target) && !graph.hasEdge(source, target)) {
        graph.addEdge(source, target, {
          color: '#4c1d95', 
          size: 2,
          type: 'line'
        });
      }
    });

    // 4. Load into Sigma
    loadGraph(graph);
    
    // 5. Run Layout (One-shot for stability)
    assignLayout();

  }, [nodes, edges, loadGraph, assignLayout]);

  return null;
};

// --- SUB-COMPONENT: Event Handler ---
const GraphEvents = ({ onNodeClick }: { onNodeClick: (id: string) => void }) => {
  const registerEvents = useRegisterEvents();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        // Prevent event bubbling
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

export const GraphCanvas2D = ({ onNodeClick }: GraphCanvas2DProps) => {
  return (
    // Container must have explicit dimensions
    <div style={{ width: '100%', height: '100%', backgroundColor: '#02020B' }}>
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={{
          allowInvalidContainer: true,
          renderLabels: true,
          labelColor: { color: '#FFFFFF', attribute: 'color' },
          labelSize: 14,
          labelRenderedSizeThreshold: 6,
          labelFont: "Inter, sans-serif",
          zIndex: true,
          defaultEdgeType: 'line',
          defaultNodeType: 'circle',
        }}
      >
        <GraphDataSynchronizer />
        <GraphEvents onNodeClick={onNodeClick} />
      </SigmaContainer>
    </div>
  );
};