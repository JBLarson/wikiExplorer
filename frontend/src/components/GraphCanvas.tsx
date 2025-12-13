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
    width: 0, 
    height: 0 
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

  // STABILIZED RESIZE OBSERVER
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions(prev => {
          if (Math.abs(prev.width - width) < 5 && Math.abs(prev.height - height) < 5) return prev;
          return { width, height };
        });
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        if (!Array.isArray(entries) || !entries.length) return;
        updateDimensions();
      });
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('orientationchange', updateDimensions);
    
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // Lighting
  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    
    if (nodes.length > 0 && !lightsInitializedRef.current) {
      setupLighting(scene, nodes.length);
      setupFog(scene);
      lightsInitializedRef.current = true;
    } else if (nodes.length === 0 && lightsInitializedRef.current) {
      lightsInitializedRef.current = false;
    }
  }, [nodes.length]);

  // --- ANIMATION LOOP (Mist + Labels) ---
  useEffect(() => {
    // If graph engine isn't ready or empty, don't start loop
    if (!fgRef.current || nodes.length === 0) return;
    
    const renderer = (fgRef.current as any).renderer();
    if (renderer && typeof renderer.setPixelRatio === 'function') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }

    // Always restart loop on dependency change to ensure it isn't dead
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
    
    // Cancel any existing loop before starting a new one
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animate();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [nodes.length, graphicsQuality]); // Re-run if Quality toggles

  // Physics Logic
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;

    const currentNodeCount = nodes.length;
    const wasPruned = currentNodeCount < prevNodeCount.current;
    
    if (animatingNodes.current.size > 0) {
      const toRemove: THREE.Object3D[] = [];
      animatingNodes.current.forEach(obj => {
        if (!obj.parent) toRemove.push(obj);
      });
      toRemove.forEach(obj => animatingNodes.current.delete(obj));
    }

    if (currentNodeCount > 0) {
        if (wasPruned) {
            setAlphaDecay(0.05);
            fgRef.current.d3ReheatSimulation();
        } 
        else if (currentNodeCount > prevNodeCount.current) {
            setAlphaDecay(0.01);
            fgRef.current.d3ReheatSimulation();
        }
    }
    prevNodeCount.current = currentNodeCount;
  }, [nodes.length, edges.length]);

  // Force Config
  useEffect(() => {
    if (!fgRef.current || nodes.length === 0) return;
    const linkForce = fgRef.current.d3Force('link');
    if (linkForce) {
      linkForce
        .distance((link: any) => (link.distance || 150) * 0.4)
        .strength(1.0);
    }
    fgRef.current.d3Force('charge')?.strength(-800); 
    fgRef.current.d3Force('center')?.strength(0.1); 
  }, [nodes.length, edges.length]); 

  const handleNodeClick = useCallback((node: any) => {
    if (!node || typeof node.x !== 'number') return;
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

  // Strict Mount Checks
  if (nodes.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
    return <div ref={containerRef} className="w-full h-full bg-abyss" />;
  }

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
        warmupTicks={120}
        cooldownTicks={Infinity}
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

        // Re-inject sharedTimeUniform to create new material instances on mount
        linkThreeObject={graphicsQuality === 'high' ? () => {
          return createMistConnection(sharedTimeUniform.current);
        } : undefined}

        linkPositionUpdate={graphicsQuality === 'high' ? (obj: any, { start, end }: any) => {
          if (!obj || !obj.material || !start || !end) return false;
          if (isNaN(start.x) || isNaN(end.x)) return false;

          const material = obj.material as THREE.ShaderMaterial;
          if (material && material.uniforms && material.uniforms.startPos && material.uniforms.endPos) {
            material.uniforms.startPos.value.copy(start);
            material.uniforms.endPos.value.copy(end);
            return true;
          }
          return false;
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