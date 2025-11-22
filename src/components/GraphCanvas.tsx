import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, {ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
}

// Deep Semantic Gradient
const DEPTH_COLORS = [
  '#F43F5E', // Root: Rose (High Impact)
  '#A855F7', // Depth 1: Purple
  '#6366F1', // Depth 2: Indigo
  '#3B82F6', // Depth 3: Blue
  '#14B8A6', // Depth 4: Teal
  '#10B981', // Depth 5+: Emerald
];

export function GraphCanvas({ onNodeClick }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { nodes, edges, selectedNode, rootNode } = useGraphStore();

  // Prepare Graph Data
  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({ 
        id: n.id, 
        group: n.depth,
        label: n.label,
        val: n.id === rootNode ? 30 : 15 - (Math.min(n.depth, 5) * 1.5) // Size scaling
      })),
      links: edges.map(e => ({ 
        source: e.source, 
        target: e.target 
      }))
    };
  }, [nodes, edges, rootNode]);

  // Physics Tuning for "Graceful Spacing"
  useEffect(() => {
    if (fgRef.current) {
      // Strong repulsion to prevent clumping
      fgRef.current.d3Force('charge')?.strength(-200); 
      // Longer links to allow breathing room
      fgRef.current.d3Force('link')?.distance(90);
      // Gentle centering
      fgRef.current.d3Force('center')?.strength(0.5);
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    const distance = 180;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node, 
        2500
      );
    }
    onNodeClick(node.id);
  }, [onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#02020B"
        showNavInfo={false}
        
        // Nodes
        nodeLabel="label"
        nodeRelSize={8}
        nodeResolution={24}
        nodeOpacity={1}
        
        // Custom ThreeJS Object for FAANG Quality
        nodeThreeObject={(node: any) => {
          const depthIndex = Math.min(node.group, DEPTH_COLORS.length - 1);
          const baseColor = DEPTH_COLORS[depthIndex];
          const isSelected = node.id === selectedNode;

          const group = new THREE.Group();

          // 1. The Core Sphere (Physical Material for sheen)
          const geometry = new THREE.SphereGeometry(node.val * 0.5, 32, 32);
          const material = new THREE.MeshPhysicalMaterial({
            color: isSelected ? '#FFFFFF' : baseColor,
            emissive: baseColor,
            emissiveIntensity: isSelected ? 0.8 : 0.3,
            roughness: 0.1,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
          });
          const mesh = new THREE.Mesh(geometry, material);
          group.add(mesh);

          // 2. The Label (Sprite)
          // OFFSET VERTICALLY to ensure full visibility
          const sprite = new SpriteText(node.label);
          sprite.color = isSelected ? '#FFFFFF' : '#E2E8F0'; // Slate-200 normally
          sprite.textHeight = 5 + (node.val * 0.1); // Scale text with node importance
          sprite.fontFace = 'Inter';
          sprite.fontWeight = '600';
          sprite.backgroundColor = 'rgba(2, 2, 11, 0.6)'; // Semi-transparent background for legibility
          sprite.padding = 2;
          sprite.borderRadius = 4;
          
          // The Magic Fix: Position text 1.5x radius above the node
          sprite.position.set(0, node.val * 0.8 + 8, 0);
          
          group.add(sprite);

          return group;
        }}

        // Links
        linkColor={() => '#2d314d'}
        linkWidth={1.5}
        linkOpacity={0.2}
        linkDirectionalParticles={node => node.id === selectedNode ? 4 : 2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => '#6366F1'} // Brand glow

        // Interaction
        onNodeClick={handleNodeClick}
        
        // Engine
        warmupTicks={100}
        cooldownTicks={Infinity} // Keep animating slightly
      />
    </div>
  );
}