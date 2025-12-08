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
  
  // Track previous node count to detect pruning events
  const prevNodeCount = useRef(0);
  
  const [dimensions, setDimensions] = useState({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
  const sharedTimeUniform = useRef({ value: 0 });
  const animationFrameRef = useRef<number>();
  
  // Track visual objects for smooth transitions
  const animatingNodes = useRef<Set<THREE.Object3D>>(new Set());
  const hoveredNodeRef = useRef<any>(null);

  const { nodes, edges, selectedNode, rootNode, graphicsQuality } = useGraphStore();

  const nodeStats = useMemo(() => {
    return calculateGraphStats(nodes, edges);
  }, [nodes, edges]);

  // Transform store data into graph data
  // CRITICAL: We must Memoize this properly so we don't spam the graph with updates
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
          expansionCount: n.expansionCount,
          // Explicitly pass existing position if available in store (optional, but good practice)
          // For now, react-force-graph handles reference matching via 'id'
        };
      }),
      links: edges.map(e => ({ 
        source: typeof e.source === 'object' ? (e.source as any).id : e.source, 
        target: typeof e.target === 'object' ? (e.target as any).id : e.target,
        distance: e.distance,
        score: e.score
      }))
    };
  }, [nodes, edges, rootNode, nodeStats]);

  useImperativeHandle(ref, () => ({
    focusNode: (nodeId: string) => {
      if (!fgRef.current) return;
      const graphNodes = (fgRef.current as any).graphData().nodes as any[];
      const targetNode = graphNodes.find(n => n.id === nodeId);
      
      if (targetNode && typeof targetNode.x === 'number') {
        const distance = 300; 
        const distRatio = 1 + distance / Math.hypot(targetNode.x, targetNode.y, targetNode.z);
        fgRef.current.cameraPosition(
          { x: targetNode.x * distRatio, y: targetNode.y * distRatio, z: targetNode.z * distRatio },
          targetNode, 
          1800  
        );
      }
    }
  }), [graphData]);

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    };
    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(updateDimensions));
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

  // Scene Setup & Animation Loop
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

      // Smooth Label Scaling
      if (animatingNodes.current.size > 0) {
        const toRemove: THREE.Object3D[] = [];
        animatingNodes.current.forEach((obj) => {
          if (!obj.parent) {
            toRemove.push(obj);
            return;
          }
          const target = obj.userData.targetScale;
          if (!target) return;
          obj.scale.lerp(target, 0.08);
          if (obj.scale.distanceTo(target) < 0.01) {
            obj.scale.copy(target);
            toRemove.push(obj);
          }
        });
        toRemove.forEach(obj => animatingNodes.current.delete(obj));
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      scene.remove(background);
      background.geometry.dispose();
      bgMaterial.dispose();
      isInitializedRef.current = false;
    };
  }, []); 

 useEffect(() => {
    if (!fgRef.current) return;

    const currentNodeCount = nodes.length;
    const wasPruned = currentNodeCount < prevNodeCount.current;
    
    // 1. Clean up visual artifacts (Ghost Labels)
    if (animatingNodes.current.size > 0) {
      const toRemove: THREE.Object3D[] = [];
      animatingNodes.current.forEach(obj => {
        if (!obj.parent) toRemove.push(obj);
      });
      toRemove.forEach(obj => animatingNodes.current.delete(obj));
    }

    // 2. Handle Physics State
    if (wasPruned) {
      // Stop the simulation briefly to let React flush the DOM/State changes
      fgRef.current.pauseAnimation();
      
      // Re-heat with a LOWER alpha decay (slower settle) to prevent snapping
      setTimeout(() => {
        if (fgRef.current) {
          // FIX: Cast to 'any' to bypass missing TS definition for d3AlphaDecay
          (fgRef.current as any).d3AlphaDecay(0.02); 
          fgRef.current.d3ReheatSimulation();
          fgRef.current.resumeAnimation();
        }
      }, 50);
    } 
    else if (currentNodeCount > prevNodeCount.current) {
      fgRef.current.d3ReheatSimulation();
    }

    prevNodeCount.current = currentNodeCount;

  }, [nodes.length, edges.length]);

  // Physics Force Configuration
  useEffect(() => {
    if (!fgRef.current) return;
    
    // Configure Link Force
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance((link: any) => (link.distance || 150) * 0.4)
        .strength(1.0);
    }

    // Configure Repulsion (Charge)
    // We increase repulsion slightly to prevent overlap after pruning
    fgRef.current.d3Force('charge')?.strength(-800); 
    
    // Configure Center Force
    // Weak center force allows graph to spread out, prevents "black hole" collapse
    fgRef.current.d3Force('center')?.strength(0.1); 

  }, [nodes.length, edges.length]); 

  const handleNodeClick = useCallback((node: any) => {
    const distance = 300;
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

  const handleNodeHover = useCallback((node: any | null) => {
    if (node !== hoveredNodeRef.current) {
      if (hoveredNodeRef.current) {
        const prevObj = hoveredNodeRef.current.__threeObj as THREE.Group;
        if (prevObj) {
          const label = prevObj.getObjectByName('label');
          if (label && label.userData.baseScale) {
            label.userData.targetScale = label.userData.baseScale;
            animatingNodes.current.add(label);
          }
        }
      }
      if (node) {
        const obj = node.__threeObj as THREE.Group;
        if (obj) {
          const label = obj.getObjectByName('label');
          if (label && label.userData.baseScale) {
            label.userData.targetScale = label.userData.baseScale.clone().multiplyScalar(2.5);
            animatingNodes.current.add(label);
          }
        }
        if (containerRef.current) containerRef.current.style.cursor = 'pointer';
      } else {
        if (containerRef.current) containerRef.current.style.cursor = 'move';
      }
      hoveredNodeRef.current = node;
    }
  }, []);

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
        
        // Critical: Tell the engine how to identify nodes across renders
        // This ensures positions are preserved when the array is filtered
        nodeId="id" 

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
          return true;
        } : undefined}

        linkVisibility={true}
        linkWidth={graphicsQuality === 'high' ? 0 : 1}
        linkColor={() => '#4c1d95'}
        
        onNodeHover={handleNodeHover}
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