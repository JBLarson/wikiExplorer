import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
  onNodeRightClick: (nodeId: string, x: number, y: number) => void;
}

// "Void Navy" Neon Palette
const DEPTH_COLORS = [
  '#6366f1', // Root: Indigo
  '#8b5cf6', // Depth 1: Violet
  '#d946ef', // Depth 2: Fuchsia
  '#ec4899', // Depth 3: Pink
  '#f43f5e', // Depth 4+: Rose
];

export function GraphCanvas({ onNodeClick, onNodeRightClick }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { nodes, edges, selectedNode, rootNode } = useGraphStore();

  // Convert store data to mutable structure required by Three.js physics engine
  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({ 
        id: n.id, 
        group: n.depth,
        label: n.label,
        val: n.id === rootNode ? 20 : 10 - (n.depth * 2) // Size based on depth
      })),
      links: edges.map(e => ({ 
        source: e.source, 
        target: e.target 
      }))
    };
  }, [nodes, edges, rootNode]);

  const getNodeColor = useCallback((depth: number) => {
    return DEPTH_COLORS[Math.min(depth, DEPTH_COLORS.length - 1)];
  }, []);

  // Initial Camera Position
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-120); // Physics repulsion
      fgRef.current.d3Force('link')?.distance(70); // Link length
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    // Aim at node from outside it
    const distance = 150;
    // FIX: Replaced hallucinated Math.hypotHB with Math.hypot
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        3000  // ms transition duration
      );
    }
    onNodeClick(node.id);
  }, [onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#050511" // The "Abyss" background
        showNavInfo={false}
        
        // Node Styling
        nodeLabel="label"
        nodeColor={(node: any) => 
          node.id === selectedNode ? '#ffffff' : getNodeColor(node.group)
        }
        nodeRelSize={6}
        nodeOpacity={0.9}
        nodeResolution={16}
        
        // Node Glow / Material
        nodeThreeObjectExtend={true}
        nodeThreeObject={(node: any) => {
          const color = node.id === selectedNode ? '#ffffff' : getNodeColor(node.group);
          // Add a glow mesh (atmospheric glow)
          const geometry = new THREE.SphereGeometry(node.val * 0.6);
          const material = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            emissive: color,
            emissiveIntensity: 0.6,
          });
          const mesh = new THREE.Mesh(geometry, material);
          
          // Add Text Label as Sprite
          const sprite = new SpriteText(node.label);
          sprite.color = node.id === selectedNode ? '#ffffff' : '#a0aec0';
          sprite.textHeight = 4;
          sprite.position.y = 12; // Offset text above node
          sprite.fontFace = 'Inter';
          sprite.fontWeight = 'bold';
          
          mesh.add(sprite);
          return mesh;
        }}

        // Edge Styling
        linkColor={() => '#2d314d'} // Dark subtle links
        linkWidth={1}
        linkOpacity={0.3}
        linkDirectionalParticles={2} // Particles flowing along links
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={() => '#6366f1'}
        
        // Interaction
        onNodeClick={handleNodeClick}
        onNodeRightClick={(node: any) => onNodeRightClick(node.id, 0, 0)}
        
        // Physics Engine Tuning for "Graceful Spacing"
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={100}
        cooldownTicks={0}
      />
    </div>
  );
}