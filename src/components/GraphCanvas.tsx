// @refresh reset
import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';
import { createAtmosphericParticles, setupLighting, setupFog } from './graph/SceneSetup';
import { createMistConnection, animateMist } from './graph/MistEffect';
import { createNodeObject } from './graph/NodeRenderer';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
  onNodeRightClick: (nodeId: string) => void;
}

export function GraphCanvas({ onNodeClick, onNodeRightClick }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const mistLinesRef = useRef<Map<string, THREE.Points>>(new Map());
  const timeRef = useRef(0);
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
        target: e.target 
      }))
    };
  }, [nodes, edges, rootNode]);

  // Initialize scene environment
  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    
    const { stars, material: starMaterial } = createAtmosphericParticles();
    scene.add(stars);

    setupLighting(scene);
    setupFog(scene);

    const animate = () => {
      timeRef.current += 0.008;
      starMaterial.uniforms.time.value = timeRef.current;
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

  // Create volumetric mist connections
  useEffect(() => {
    if (!fgRef.current) return;
    
    const scene = fgRef.current.scene();
    
    mistLinesRef.current.forEach(mist => {
      scene.remove(mist);
      mist.geometry.dispose();
      if (Array.isArray(mist.material)) {
        mist.material.forEach(m => m.dispose());
      } else {
        (mist.material as THREE.Material).dispose();
      }
    });
    mistLinesRef.current.clear();
    
    if (graphData.links.length === 0) return;

    const timeoutId = setTimeout(() => {
      if (!fgRef.current) return;

      const nodePositions = new Map<string, THREE.Vector3>();
      graphData.nodes.forEach(node => {
        const nodeData = node as any;
        if (typeof nodeData.x === 'number' && typeof nodeData.y === 'number' && typeof nodeData.z === 'number') {
          nodePositions.set(node.id, new THREE.Vector3(nodeData.x, nodeData.y, nodeData.z));
        }
      });

      graphData.links.forEach((link, index) => {
        const sourceId = typeof link.source === 'object' && link.source !== null ? (link.source as any).id : link.source as string;
        const targetId = typeof link.target === 'object' && link.target !== null ? (link.target as any).id : link.target as string;
        
        const sourcePos = nodePositions.get(sourceId);
        const targetPos = nodePositions.get(targetId);
        
        if (!sourcePos || !targetPos) return;

        const mist = createMistConnection(sourcePos, targetPos, timeRef.current + index * 0.5);
        scene.add(mist);
        
        const edgeKey = `${sourceId}-${targetId}`;
        mistLinesRef.current.set(edgeKey, mist);
      });

      const mistAnimationLoop = () => {
        animateMist(mistLinesRef.current, 0.012);
        requestAnimationFrame(mistAnimationLoop);
      };
      mistAnimationLoop();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      mistLinesRef.current.forEach(mist => {
        scene.remove(mist);
        mist.geometry.dispose();
        if (Array.isArray(mist.material)) {
          mist.material.forEach(m => m.dispose());
        } else {
          (mist.material as THREE.Material).dispose();
        }
      });
      mistLinesRef.current.clear();
    };
  }, [graphData.links, graphData.nodes]);

  // Configure force simulation
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-250);
      fgRef.current.d3Force('link')?.distance(100);
      fgRef.current.d3Force('center')?.strength(0.15);
    }
  }, []);

  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
    // Left click - expand graph
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
    // Prevent context menu
    event.preventDefault();
    
    // Right click - show explore modal
    onNodeRightClick(node.id);
  }, [onNodeRightClick]);

  // Cleanup on unmount or graph data change
  useEffect(() => {
    return () => {
      mistLinesRef.current.forEach(mist => {
        if (fgRef.current) {
          fgRef.current.scene().remove(mist);
        }
        mist.geometry.dispose();
        if (Array.isArray(mist.material)) {
          mist.material.forEach(m => m.dispose());
        } else {
          (mist.material as THREE.Material).dispose();
        }
      });
      mistLinesRef.current.clear();
    };
  }, [graphData.nodes.length]);

  return (
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#02020B"
        showNavInfo={false}
        enableNodeDrag={false}
        
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

        linkVisibility={false}
        onNodeClick={handleNodeClick}
        onNodeRightClick={handleNodeRightClick}
        
        warmupTicks={120}
        cooldownTicks={Infinity}
        cooldownTime={20000}
      />
    </div>
  );
}