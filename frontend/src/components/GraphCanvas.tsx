// frontend/src/components/GraphCanvas.tsx
// @refresh reset
import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';
import { createAtmosphericBackground, setupLighting, setupFog } from './graph/SceneSetup';
import { createMistConnection } from './graph/MistEffect';
import { createNodeObject, NodeRenderData } from './graph/NodeRenderer';
import { calculateGraphStats } from '../services/graphStats';

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
  const isInitializedRef = useRef(false); 
  
  // Initialize with window size so it renders immediately
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
  const sharedTimeUniform = useRef({ value: 0 });
  const animationFrameRef = useRef<number>();
  
  const { nodes, edges, selectedNode, rootNode, graphicsQuality } = useGraphStore();

  // 1. Calculate Topology Stats (Memoized)
  const nodeStats = useMemo(() => {
    return calculateGraphStats(nodes, edges);
  }, [nodes, edges]);

  // 2. Prepare Graph Data
  const graphData = useMemo(() => {
    return {
      nodes: nodes.map(n => {
        const stats = nodeStats.get(n.id);
        return { 
          id: n.id, 
          group: n.depth,
          label: n.label,
          importance: stats?.importance || 0,
          degree: stats?.degree || 0,
          expansionCount: n.expansionCount
        };
      }),
      links: edges.map(e => ({ 
        source: e.source, 
        target: e.target,
        distance: e.distance,
        score: e.score
      }))
    };
  }, [nodes, edges, rootNode, nodeStats]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      if (!fgRef.current) return;
      
      // --- TYPE FIX: Cast to any to access graphData() ---
      const graphNodes = (fgRef.current as any).graphData().nodes as any[];
      const targetNode = graphNodes.find(n => n.id === nodeId);
      
      if (targetNode && typeof targetNode.x === 'number') {
        const distance = 220;
        const distRatio = 1 + distance / Math.hypot(targetNode.x, targetNode.y, targetNode.z);
        
        fgRef.current.cameraPosition(
          { x: targetNode.x * distRatio, y: targetNode.y * distRatio, z: targetNode.z * distRatio },
          targetNode, 
          1800  
        );
      }
    }
  }), [graphData]);

  // 3. Resize Handling
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });
    
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', () => setTimeout(updateDimensions, 200));

    updateDimensions();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // 4. Scene Setup
  useEffect(() => {
    if (!fgRef.current) return;
    
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const scene = fgRef.current.scene();
    
    const { background, material: bgMaterial } = createAtmosphericBackground();
    scene.add(background);
    setupLighting(scene);
    setupFog(scene);

    const animate = () => {
      sharedTimeUniform.current.value += 0.012;
      if (bgMaterial && bgMaterial.uniforms) {
        bgMaterial.uniforms.time.value = sharedTimeUniform.current.value;
      }
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
      isInitializedRef.current = false;
    };
  }, []); 

  // 5. Physics & Data
  useEffect(() => {
    if (!fgRef.current) return;

    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance((link: any) => link.distance || 150)
        .strength(1.0);
    }
    
    fgRef.current.d3Force('charge')?.strength(-600); 
    fgRef.current.d3Force('center')?.strength(0.2);
    
    if (nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes.length, edges.length]); 

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
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move overflow-hidden">
      <ForceGraph3D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
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
        nodeLabel="" 
        nodeResolution={graphicsQuality === 'high' ? 24 : 8}
        nodeOpacity={1}
        
        nodeThreeObject={(node: any) => {
          const renderData: NodeRenderData = {
            id: node.id,
            label: node.label,
            group: node.group,
            importance: node.importance, 
            degree: node.degree,
            isSelected: node.id === selectedNode,
            isRoot: node.id === rootNode,
            expansionCount: node.expansionCount,
          };
          return createNodeObject(renderData, graphicsQuality);
        }}

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