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
}

export function GraphCanvas({ onNodeClick, onNodeRightClick }: GraphCanvasProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Shared time uniform for all mist shaders
  // This allows us to animate thousands of edges by updating one variable
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

  useEffect(() => {
  if (fgRef.current) {
    fgRef.current.d3Force('link')
      ?.distance((link: any) => link.distance || 150); // Use pre-calculated
  }
  }, []);

  // Re-heat simulation when nodes are added
  useEffect(() => {
    if (fgRef.current && nodes.length > 0) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [nodes.length]);

  // Initialize scene environment and animation loop
  useEffect(() => {
    if (!fgRef.current) return;
    const scene = fgRef.current.scene();
    
    const { stars, material: starMaterial } = createAtmosphericParticles();
    scene.add(stars);

    setupLighting(scene);
    setupFog(scene);

    const animate = () => {
      // Increment global time
      sharedTimeUniform.current.value += 0.012;
      
      // Sync star shader time
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



  // configure force simulation
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-400);
      
      // Set the distance function ONCE - it will read link.distance property
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        linkForce
          .distance((link: any) => {
            const dist = link.distance || 150;
            console.log('🔗 Edge:', link.source?.id || link.source, '->', link.target?.id || link.target, '| distance:', dist);
            return dist;
          })
          .strength(1.5);
      }
      
      fgRef.current.d3Force('center')?.strength(0.2);
    }
  }, []); // Keep empty - only run once

  // Reheat when edges change - with a more aggressive trigger
  useEffect(() => {
    if (fgRef.current && edges.length > 0) {
      // Force the link force to reinitialize with current edges
      const linkForce = fgRef.current.d3Force('link');
      if (linkForce) {
        // Re-apply the distance function to ensure it picks up new edges
        linkForce.distance((link: any) => link.distance || 150);
      }
      
      // Reheat the simulation more aggressively for initial load
      fgRef.current.d3ReheatSimulation();
      
      console.log('Reheated simulation with', edges.length, 'edges');
    }
  }, [edges.length]); // Trigger on count change




  const handleNodeClick = useCallback((node: any, event: MouseEvent) => {
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

          // Add renderer configuration
          rendererConfig={{
            powerPreference: 'high-performance',
            antialias: true,
            alpha: false,  // Disable alpha for better performance
            precision: 'highp',  // High precision shaders
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

        // Create the Mist object for each link
        linkThreeObject={() => {
          return createMistConnection(sharedTimeUniform.current);
        }}

        // Update the Mist object every frame to match physics simulation
        linkPositionUpdate={(obj: any, { start, end }: any) => {
          // The object is a Three.js Points mesh with a ShaderMaterial
          const material = obj.material as THREE.ShaderMaterial;
          
          // Update the uniforms with the new start/end positions relative to graph space
          if (material && material.uniforms) {
            material.uniforms.startPos.value.copy(start);
            material.uniforms.endPos.value.copy(end);
          }

          // Reset transforms so the shader works in local coordinate space
          // This prevents the library from trying to rotate/scale the point cloud
          // which would fight against our custom vertex shader logic.
          obj.position.set(0, 0, 0);
          obj.rotation.set(0, 0, 0);
          obj.scale.set(1, 1, 1);
          
          return true; // Signal that we handled the update
        }}

        linkVisibility={true} // Must be true to show our custom object
        
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