// @refresh reset
import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
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

export interface GraphCanvasRef {
  focusNode: (nodeId: string) => void;
}

export const GraphCanvas = forwardRef<GraphCanvasRef, GraphCanvasProps>(({ onNodeClick, onNodeRightClick, isSidebarOpen }, ref) => {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const sharedTimeUniform = useRef({ value: 0 });
  const animationFrameRef = useRef<number>();
  
  const { nodes, edges, selectedNode, rootNode, graphicsQuality } = useGraphStore();

  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => ({ 
        id: n.id, 
        group: n.depth,
        label: n.label,
        val: n.id === rootNode ? 50 : 35 - (Math.min(n.depth, 5) * 2),
        expansionCount: n.expansionCount 
      })),
      links: edges.map(e => ({ 
        source: e.source, 
        target: e.target,
        distance: e.distance,
        score: e.score
      }))
    };
  }, [nodes, edges, rootNode]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      if (!fgRef.current) return;
      
      // FIX: Use local graphData variable instead of querying the ref
      // The library mutates this object with x/y/z coordinates
      const targetNode = graphData.nodes.find((n: any) => n.id === nodeId);
      
      if (targetNode && typeof (targetNode as any).x === 'number') {
        const distance = 220;
        const node = targetNode as any;
        const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
        
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node, 
          1800  
        );
      }
    }
  }), [graphData]); // <--- CRITICAL: Re-create this function when graphData changes

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current || !fgRef.current) return;
    const handleResize = () => {
      if (containerRef.current && fgRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const methods = fgRef.current as any;
        if (methods.width && methods.height) {
          methods.width(width);
          methods.height(height);
        }
      }
    };
    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Sidebar resize trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current && fgRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const methods = fgRef.current as any;
        if (methods.width && methods.height) {
          methods.width(width);
          methods.height(height);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // Physics Forces
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

  // Reheat simulation
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes.length]);

  // Background & Animation Loop
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
          antialias: graphicsQuality === 'high',
          alpha: false,
          precision: graphicsQuality === 'high' ? 'highp' : 'mediump',
        }}
        nodeLabel="label"
        nodeRelSize={7}
        nodeResolution={graphicsQuality === 'high' ? 24 : 8}
        nodeOpacity={1}
        
        // Pass graphicsQuality to renderer
        nodeThreeObject={(node: any) => {
          return createNodeObject({
            id: node.id,
            label: node.label,
            group: node.group,
            val: node.val,
            isSelected: node.id === selectedNode,
            isRoot: node.id === rootNode,
            expansionCount: node?.expansionCount ?? 0,
          }, graphicsQuality);
        }}

        // Conditionally render expensive Mist effect
        linkThreeObject={graphicsQuality === 'high' ? () => {
          return createMistConnection(sharedTimeUniform.current);
        } : undefined}

        linkPositionUpdate={graphicsQuality === 'high' ? (obj: any, { start, end }: any) => {
          const material = obj.material as THREE.ShaderMaterial;
          if (material && material.uniforms) {
            material.uniforms.startPos.value.copy(start);
            material.uniforms.endPos.value.copy(end);
          }
          obj.position.set(0, 0, 0);
          obj.rotation.set(0, 0, 0);
          obj.scale.set(1, 1, 1);
          return true;
        } : undefined}

        // Native line fallback for Low quality
        linkVisibility={true}
        linkWidth={graphicsQuality === 'high' ? 0 : 1}
        linkColor={() => '#4c1d95'}
        
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
});