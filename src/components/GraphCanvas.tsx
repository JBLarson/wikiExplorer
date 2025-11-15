import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { useGraphStore } from '../stores/graphStore';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
  onNodeRightClick: (nodeId: string, x: number, y: number) => void;
}

const cyStyle = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-family': 'Inter, sans-serif',
      'font-size': 11,
      'font-weight': 600,
      'color': '#1f2937',
      'text-wrap': 'wrap',
      'text-max-width': 80,
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#e5e7eb',
      'width': 90,
      'height': 90,
      'shape': 'ellipse',
      'transition-property': 'background-color, border-color, border-width',
      'transition-duration': '0.15s',
    },
  },
  {
    selector: 'node.selected',
    style: {
      'background-color': '#eff6ff',
      'border-color': '#36006B',
      'border-width': 4,
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#e5e7eb',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#e5e7eb',
      'arrow-scale': 1,
      'curve-style': 'bezier',
      'opacity': 0.7,
      'transition-property': 'line-color, target-arrow-color, opacity, width',
      'transition-duration': '0.15s',
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'width': 3,
      'line-color': '#36006B',
      'target-arrow-color': '#36006B',
      'opacity': 1,
    },
  },
];

const cyLayout = {
  name: 'cose',
  animate: true,
  animationDuration: 400,
  animationEasing: 'ease-out',
  idealEdgeLength: 120,
  nodeOverlap: 20,
  nodeRepulsion: () => 80000,
  edgeElasticity: () => 100,
  nestingFactor: 5,
  gravity: 1.2,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
  fit: true,
  padding: 40,
};

export function GraphCanvas({ onNodeClick, onNodeRightClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRunningRef = useRef(false);
  const { nodes, edges, selectedNode } = useGraphStore();
  
  const handleNodeTap = useCallback((evt: any) => {
    onNodeClick(evt.target.id());
  }, [onNodeClick]);

  const handleNodeRightClick = useCallback((evt: any) => {
    evt.preventDefault();
    const node = evt.target;
    const renderedPosition = node.renderedPosition();
    onNodeRightClick(node.id(), renderedPosition.x, renderedPosition.y);
  }, [onNodeRightClick]);

  const handleNodeMouseOver = useCallback((evt: any) => {
    evt.target.connectedEdges().addClass('highlighted');
  }, []);

  // --- MODIFIED ---
  // Make mouse-out "selection-aware"
  const handleNodeMouseOut = useCallback((evt: any) => {
    const cy = cyRef.current;
    if (!cy) return;

    // Get the edges that are part of the permanent selection
    const selectedNodeElement = cy.getElementById(selectedNode ?? '');
    const selectedEdges = selectedNodeElement.length > 0 ? selectedNodeElement.connectedEdges() : cy.collection();

    // Loop through the edges of the node we moused-out of
    evt.target.connectedEdges().forEach((edge: any) => {
      // Only remove highlight if this edge is NOT part of the permanent selection
      if (!selectedEdges.contains(edge)) {
        edge.removeClass('highlighted');
      }
    });
  }, [selectedNode]); // <-- ADDED selectedNode dependency

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;
    
    cyRef.current = cytoscape({
      container: containerRef.current,
      style: cyStyle as any,
      // wheelSensitivity: 0.2, // <-- REMOVED
      minZoom: 0.3,
      maxZoom: 3,
      layout: { name: 'preset' },
    });
    
    const cy = cyRef.current;
    
    cy.on('tap', 'node', handleNodeTap);
    cy.on('cxttap', 'node', handleNodeRightClick);
    cy.on('mouseover', 'node', handleNodeMouseOver);
    cy.on('mouseout', 'node', handleNodeMouseOut);
    
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [handleNodeTap, handleNodeRightClick, handleNodeMouseOver, handleNodeMouseOut]); // handleNodeMouseOut is now stable
  
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
    const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
    
    const newNodes = nodes
      .filter(n => !existingNodeIds.has(n.id))
      .map(node => ({
        group: 'nodes' as const,
        data: { id: node.id, label: node.label },
      }));

    const newEdges = edges
      .filter(e => !existingEdgeIds.has(e.id))
      .map(edge => ({
        group: 'edges' as const,
        data: { id: edge.id, source: edge.source, target: edge.target },
      }));

    const newElements = [...newNodes, ...newEdges];

    if (newElements.length > 0) {
      cy.add(newElements);
      
      if (!layoutRunningRef.current) {
        layoutRunningRef.current = true;
        
        const layout = cy.layout({
          ...cyLayout,
          stop: () => {
            layoutRunningRef.current = false;
          },
        } as any);
        
        layout.run();
      }
    }
  }, [nodes, edges]);
  
  // --- MODIFIED ---
  // This effect is now the single source of truth for the "selected" state
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    
    // 1. Clear all previous node and edge selections
    cy.nodes().removeClass('selected');
    cy.edges().removeClass('highlighted');
    
    if (selectedNode) {
      const nodeElement = cy.getElementById(selectedNode);
      if (nodeElement.length > 0) {
        // 2. Add 'selected' class to the node
        nodeElement.addClass('selected');
        // 3. Add 'highlighted' class to its connected edges
        nodeElement.connectedEdges().addClass('highlighted');
      }
    }
  }, [selectedNode]);
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-bg-subtle"
    />
  );
}