import { useEffect, useRef, useCallback, useState } from 'react';
import cytoscape from 'cytoscape';
import { useGraphStore } from '../stores/graphStore';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
  onNodeRightClick: (nodeId: string, x: number, y: number) => void;
}

const DEPTH_COLORS = [
  '#9333ea', // depth 0 (root) - vibrant purple
  '#a855f7', // depth 1 - lighter purple
  '#c084fc', // depth 2 - even lighter
  '#d8b4fe', // depth 3 - very light purple
  '#e9d5ff', // depth 4+ - lightest purple
];

const cyStyle = [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-family': 'Inter, system-ui, -apple-system, sans-serif',
      'font-size': 12,
      'font-weight': 600,
      'color': '#1f2937',
      'text-wrap': 'wrap',
      'text-max-width': 100,
      'background-color': 'data(bgColor)',
      'border-width': 2,
      'border-color': 'data(borderColor)',
      'width': 'data(size)',
      'height': 'data(size)',
      'shape': 'ellipse',
      'transition-property': 'background-color, border-color, border-width, width, height',
      'transition-duration': '0.2s',
      'text-outline-width': 2,
      'text-outline-color': '#ffffff',
    },
  },
  {
    selector: 'node.root',
    style: {
      'width': 110,
      'height': 110,
      'border-width': 3,
      'font-size': 13,
      'font-weight': 700,
    },
  },
  {
    selector: 'node.selected',
    style: {
      'background-color': '#eff6ff',
      'border-color': '#3b82f6',
      'border-width': 4,
      'width': 'calc(data(size) * 1.1)',
      'height': 'calc(data(size) * 1.1)',
    },
  },
  {
    selector: 'node.hovered',
    style: {
      'border-width': 3,
      'width': 'calc(data(size) * 1.05)',
      'height': 'calc(data(size) * 1.05)',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 'data(width)',
      'line-color': '#e5e7eb',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#e5e7eb',
      'arrow-scale': 1.2,
      'curve-style': 'bezier',
      'opacity': 0.6,
      'transition-property': 'line-color, target-arrow-color, opacity, width',
      'transition-duration': '0.2s',
    },
  },
  {
    selector: 'edge.highlighted',
    style: {
      'width': 3,
      'line-color': '#9333ea',
      'target-arrow-color': '#9333ea',
      'opacity': 1,
    },
  },
];

const cyLayout = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  animationEasing: 'ease-out',
  idealEdgeLength: 150,
  nodeOverlap: 30,
  nodeRepulsion: () => 100000,
  edgeElasticity: () => 120,
  nestingFactor: 5,
  gravity: 1.5,
  numIter: 1500,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
  fit: true,
  padding: 60,
};

export function GraphCanvas({ onNodeClick, onNodeRightClick }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const layoutRunningRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { nodes, edges, selectedNode, rootNode } = useGraphStore();
  
  const getNodeColor = useCallback((depth: number): string => {
    return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  }, []);
  
  const getNodeSize = useCallback((depth: number): number => {
    if (depth === 0) return 110;
    if (depth === 1) return 95;
    return Math.max(80, 95 - (depth * 5));
  }, []);
  
  const getEdgeWidth = useCallback((score?: number): number => {
    if (!score) return 2;
    return Math.max(1.5, Math.min(4, score / 25));
  }, []);
  
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
    evt.target.addClass('hovered');
    evt.target.connectedEdges().addClass('highlighted');
  }, []);

  const handleNodeMouseOut = useCallback((evt: any) => {
    const cy = cyRef.current;
    if (!cy) return;

    evt.target.removeClass('hovered');
    
    const selectedNodeElement = cy.getElementById(selectedNode ?? '');
    const selectedEdges = selectedNodeElement.length > 0 ? selectedNodeElement.connectedEdges() : cy.collection();

    evt.target.connectedEdges().forEach((edge: any) => {
      if (!selectedEdges.contains(edge)) {
        edge.removeClass('highlighted');
      }
    });
  }, [selectedNode]);

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;
    
    cyRef.current = cytoscape({
      container: containerRef.current,
      style: cyStyle as any,
      minZoom: 0.2,
      maxZoom: 3,
      layout: { name: 'preset' },
      wheelSensitivity: 0.15,
    });
    
    const cy = cyRef.current;
    
    cy.on('tap', 'node', handleNodeTap);
    cy.on('cxttap', 'node', handleNodeRightClick);
    cy.on('mouseover', 'node', handleNodeMouseOver);
    cy.on('mouseout', 'node', handleNodeMouseOut);
    
    setIsInitialized(true);
    
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
        setIsInitialized(false);
      }
    };
  }, [handleNodeTap, handleNodeRightClick, handleNodeMouseOver, handleNodeMouseOut]);
  
  // Add new nodes and edges
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return;
    
    const cy = cyRef.current;
    const existingNodeIds = new Set(cy.nodes().map(n => n.id()));
    const existingEdgeIds = new Set(cy.edges().map(e => e.id()));
    
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    const newNodes = nodes
      .filter(n => !existingNodeIds.has(n.id))
      .map(node => {
        const isRoot = node.id === rootNode;
        const depth = node.depth;
        
        return {
          group: 'nodes' as const,
          data: {
            id: node.id,
            label: node.label,
            bgColor: getNodeColor(depth),
            borderColor: getNodeColor(depth),
            size: getNodeSize(depth),
          },
          classes: isRoot ? 'root' : '',
        };
      });

    const newEdges = edges
      .filter(e => !existingEdgeIds.has(e.id))
      .map(edge => ({
        group: 'edges' as const,
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          width: getEdgeWidth(edge.score),
        },
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
  }, [nodes, edges, rootNode, isInitialized, getNodeColor, getNodeSize, getEdgeWidth]);
  
  // Handle selection state
  useEffect(() => {
    if (!cyRef.current || !isInitialized) return;
    
    const cy = cyRef.current;
    
    cy.nodes().removeClass('selected');
    cy.edges().removeClass('highlighted');
    
    if (selectedNode) {
      const nodeElement = cy.getElementById(selectedNode);
      if (nodeElement.length > 0) {
        nodeElement.addClass('selected');
        nodeElement.connectedEdges().addClass('highlighted');
      }
    }
  }, [selectedNode, isInitialized]);
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gradient-to-br from-slate-50 to-gray-100"
    />
  );
}
