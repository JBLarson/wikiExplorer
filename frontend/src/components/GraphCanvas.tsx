// frontend/src/components/GraphCanvas.tsx
// @refresh reset
import { useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';
import { setupLighting, setupFog } from './graph/SceneSetup';
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
  const lightsInitializedRef = useRef(false);
  
  // State for Physics Stability
  const [alphaDecay, setAlphaDecay] = useState(0.01);
  
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
  const graphData = useMemo(() => {
    // CRITICAL FIX: If nodes are empty, strictly return empty arrays
    // This prevents the engine from trying to process undefined data
    if (nodes.length === 0) {
      return { nodes: [], links: [] };
    }

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
      const graphInstance = fgRef.current as any;

      if (!graphInstance || typeof graphInstance.graphData !== 'function') {
        console.warn('Graph not ready for focusNode');
        return;
      }

      const currentData = graphInstance.graphData();
      if (!currentData || !currentData.nodes) return;

      const graphNodes = currentData.nodes as any[];
      const targetNode = graphNodes.find(n => n.id === nodeId);
      
      if (targetNode && typeof targetNode.x === 'number') {
        const distance = 300; 
        const distRatio = 1 + distance / Math.hypot(targetNode.x, targetNode.y, targetNode.z);
        
        if (graphInstance.cameraPosition) {
          graphInstance.cameraPosition(
            { x: targetNode.x * distRatio, y: targetNode.y * distRatio, z: targetNode.z * distRatio },
            targetNode, 
            1800  
          );
        }
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

  // Lighting: Only initialize when nodes exist
  useEffect(() => {
    if (!fgRef.current) return;
    
    const scene = fgRef.current.scene();
    
    if (nodes.length > 0 && !lightsInitializedRef.current) {
      // First time we have nodes - add lights
      setupLighting(scene, nodes.length);
      setupFog(scene);
      lightsInitializedRef.current = true;
    } else if (nodes.length === 0 && lightsInitializedRef.current) {
      // Graph cleared - remove all lights
      const lightsToRemove = scene.children.filter(
        c => c.type === 'DirectionalLight' || c.type === 'AmbientLight'
      );
      lightsToRemove.forEach(light => {
        scene.remove(light);
        if ((light as any).dispose) (light as any).dispose();
      });
      
      // Remove fog
      scene.fog = null;
      
      lightsInitializedRef.current = false;
    }
  }, [nodes.length]);

  // Scene Setup & Animation Loop
  useEffect(() => {
    if (!fgRef.current) return;
    
    // CRITICAL: Pause animation explicitly when empty
    if (nodes.length === 0) {
      fgRef.current.pauseAnimation();
      return; 
    } else {
      fgRef.current.resumeAnimation();
    }

    // CRITICAL: Clamp pixel ratio to 1.5 max (saves ~40% GPU on Retina displays)
    const renderer = (fgRef.current as any).renderer();
    if (renderer && typeof renderer.setPixelRatio === 'function') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const animate = () => {
      sharedTimeUniform.current.value += 0.012;

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
      isInitializedRef.current = false;
    };
  }, [nodes.length]); 

  // Stability Fix for Pruning
  useEffect(() => {
    if (!fgRef.current) return;

    const currentNodeCount = nodes.length;
    const wasPruned = currentNodeCount < prevNodeCount.current;
    
    // Clean up visual artifacts (Ghost Labels)
    if (animatingNodes.current.size > 0) {
      const toRemove: THREE.Object3D[] = [];
      animatingNodes.current.forEach(obj => {
        if (!obj.parent) toRemove.push(obj);
      });
      toRemove.forEach(obj => animatingNodes.current.delete(obj));
    }

    // Handle Physics State
    if (currentNodeCount > 0) {
        if (wasPruned) {
            // PRUNING: Higher alpha decay for quick settling
            setAlphaDecay(0.05);
            fgRef.current.d3ReheatSimulation();
        } 
        else if (currentNodeCount > prevNodeCount.current) {
            // EXPANSION: Lower decay for gradual positioning
            setAlphaDecay(0.01);
            fgRef.current.d3ReheatSimulation();
        }
    }

    prevNodeCount.current = currentNodeCount;

  }, [nodes.length, edges.length]);

  // Physics Force Configuration
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    
    // Configure Link Force
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance((link: any) => (link.distance || 150) * 0.4)
        .strength(1.0);
    }

    // Configure Repulsion (Charge)
    fgRef.current.d3Force('charge')?.strength(-800); 
    
    // Configure Center Force
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

  // CRITICAL FIX: If graph is empty, turn off simulation completely
  const shouldRunSimulation = nodes.length > 0;

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
        
        nodeId="id" 

        d3AlphaDecay={alphaDecay}

        // CRITICAL FIX: Set cooldownTicks to 0 when empty. 
        // This prevents 'd3' from trying to tick on undefined nodes.
        warmupTicks={shouldRunSimulation ? 120 : 0}
        cooldownTicks={shouldRunSimulation ? Infinity : 0}
        cooldownTime={15000}
        d3VelocityDecay={0.3}

        rendererConfig={{
          powerPreference: 'high-performance',
          antialias: graphicsQuality === 'high',
          alpha: false,
          precision: graphicsQuality === 'high' ? 'highp' : 'mediump',
        }}
        nodeLabel="" 
        nodeResolution={4}
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
          // CRITICAL FIX: Safety check for mist effect update
          if (!obj || !start || !end) return false;
          
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
      />
    </div>
  );
});