// frontend/src/components/GraphCanvas.tsx
// @refresh reset
import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';
import { createAtmosphericBackground, setupLighting, setupFog } from './graph/SceneSetup';
import { createMistConnection } from './graph/MistEffect';
import { createNodeObject } from './graph/NodeRenderer';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
  onNodeRightClick: (nodeId: string) => void;
  isSidebarOpen: boolean;
}

export function GraphCanvas({ onNodeClick, onNodeRightClick, isSidebarOpen }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sharedTimeUniform = useRef({ value: 0 });
  const animationFrameRef = useRef<number>();
  
  const { nodes, edges, selectedNode, rootNode } = useGraphStore();

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({ 
        id: n.id, 
        group: n.depth,
        label: n.label,
        val: n.id === rootNode ? 50 : 35 - (Math.min(n.depth, 5) * 2)
      })),
      links: edges.map(e => ({ 
        source: e.source, 
        target: e.target,
        distance: e.distance,
        score: e.score
      }))
    };
  }, [nodes, edges, rootNode]);

  // Handle resize with proper sizing
  useEffect(() => {
    if (!containerRef.current || !fgRef.current) return;

    const handleResize = () => {
      if (containerRef.current && fgRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const methods = fgRef.current as any;
        
        if (methods.width && methods.height && width > 0 && height > 0) {
          methods.width(width);
          methods.height(height);
        }
      }
    };

    // Initial size
    handleResize();

    // Use ResizeObserver for smooth resizing
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Sidebar triggers resize
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && fgRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const methods = fgRef.current as any;
        
        if (methods.width && methods.height && width > 0 && height > 0) {
          methods.width(width);
          methods.height(height);
        }
      }
    }, 300); // Wait for sidebar animation

    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // Configure forces AFTER graph is initialized
  useEffect(() => {
    if (!fgRef.current) return;
    
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance((link: any) => link.distance || 150)
        .strength(1.0);
    }
    
    fgRef.current.d3Force('charge')?.strength(-400);
    fgRef.current.d3Force('center')?.strength(0.2);
    
  }, []);

  // Reheat simulation when nodes are added
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes.length]);

  // Setup background scene
  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    
    const { background, material: bgMaterial } = createAtmosphericBackground();
    scene.add(background);
    
    setupLighting(scene);
    setupFog(scene);

    const animate = () => {
      sharedTimeUniform.current.value += 0.012;
      bgMaterial.uniforms.time.value = sharedTimeUniform.current.value;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      scene.remove(background);
      background.geometry.dispose();
      bgMaterial.dispose();
    };
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    const distance = 220;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    if (fgRef.current) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1800
      );
    }
    onNodeClick(node.id);
  }, [onNodeClick]);

  const handleNodeRightClick = useCallback((node: any, event: MouseEvent) => {
    event.preventDefault();
    onNodeRightClick(node.id);
  }, [onNodeRightClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#02020B"
        showNavInfo={false}
        enableNodeDrag={false}
        rendererConfig={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: false,
          precision: 'highp',
        }}
        nodeLabel="label"
        nodeRelSize={7}
        nodeResolution={24}
        nodeOpacity={1}
        
        nodeThreeObject={(node: any) => {
          return createNodeObject({
            id: node.id,
            label: node.label,
            group: node.group,
            val: node.val,
            isSelected: node.id === selectedNode,
            isRoot: node.id === rootNode,
          });
        }}
        linkThreeObject={() => {
          return createMistConnection(sharedTimeUniform.current);
        }}
        linkPositionUpdate={(obj: any, { start, end }: any) => {
          const material = obj.material as THREE.ShaderMaterial;
          
          if (material && material.uniforms) {
            material.uniforms.startPos.value.copy(start);
            material.uniforms.endPos.value.copy(end);
          }
          obj.position.set(0, 0, 0);
          obj.rotation.set(0, 0, 0);
          obj.scale.set(1, 1, 1);
          
          return true;
        }}
        linkVisibility={true}
        
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        
        warmupTicks={120}
        cooldownTicks={Infinity}
        cooldownTime={15000}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}