// @refresh reset
import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';
import { createAtmosphericParticles, setupLighting, setupFog } from './graph/SceneSetup';
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
  const resizeTimeoutRef = useRef<number>();
  
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

  // Handle window resize with debouncing
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current !== undefined) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = window.setTimeout(() => {
        if (fgRef.current && containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          const methods = fgRef.current as any;
          if (methods.width && methods.height) {
            methods.width(width);
            methods.height(height);
          }
        }
      }, 150) as unknown as number;
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current !== undefined) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Handle sidebar open/close
  useEffect(() => {
    if (resizeTimeoutRef.current !== undefined) {
      window.clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = window.setTimeout(() => {
      if (fgRef.current && containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const methods = fgRef.current as any;
        if (methods.width && methods.height) {
          methods.width(width);
          methods.height(height);
        }
      }
    }, 300) as unknown as number;

    return () => {
      if (resizeTimeoutRef.current !== undefined) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('link')?.distance((link: any) => link.distance || 150);
    }
  }, []);

  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes.length]);

  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    
    const { stars, material: starMaterial } = createAtmosphericParticles();
    scene.add(stars);

    setupLighting(scene);
    setupFog(scene);

    const animate = () => {
      sharedTimeUniform.current.value += 0.012;
      starMaterial.uniforms.time.value = sharedTimeUniform.current.value;
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      scene.remove(stars);
      stars.geometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-400);
      
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        linkForce.distance((link: any) => link.distance || 150).strength(1.5);
      }
      
      fgRef.current.d3Force('center')?.strength(0.2);
    }
  }, []);

  useEffect(() => {
    if (fgRef.current && edges.length > 0) {
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        linkForce.distance((link: any) => link.distance || 150);
      }
      
      fgRef.current.d3ReheatSimulation();
    }
  }, [edges.length]);

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