import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D, { ForceGraphMethods } from 'react-force-graph-3d';
import { useGraphStore } from '../stores/graphStore';
import * as THREE from 'three';

interface GraphCanvasProps {
  onNodeClick: (nodeId: string) => void;
}

const DEPTH_COLORS = [
  0xF43F5E, // Root: Rose
  0xA855F7, // Depth 1: Purple
  0x6366F1, // Depth 2: Indigo
  0x3B82F6, // Depth 3: Blue
  0x14B8A6, // Depth 4: Teal
  0x10B981, // Depth 5+: Emerald
];

export function GraphCanvas({ onNodeClick }: GraphCanvasProps) {
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
        val: n.id === rootNode ? 28 : 18 - (Math.min(n.depth, 5) * 1.8)
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
    
    // Subtle atmospheric particles
    const starCount = 1200;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 800 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const colorChoice = Math.random();
      const color = new THREE.Color();
      if (colorChoice < 0.4) {
        color.setHex(0x6366f1);
      } else if (colorChoice < 0.7) {
        color.setHex(0xa855f7);
      } else {
        color.setHex(0x818cf8);
      }
      
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
      
      starSizes[i] = Math.random() * 1.5 + 0.3;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        
        void main() {
          vColor = color;
          
          // Twinkle effect
          float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.5 + 0.5;
          vAlpha = twinkle * 0.4 + 0.3;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Subtle directional lighting
    const keyLight = new THREE.DirectionalLight(0x8b5cf6, 0.8);
    keyLight.position.set(100, 200, 100);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.4);
    fillLight.position.set(-100, -50, -100);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.6);
    backLight.position.set(0, 50, -200);
    scene.add(backLight);

    scene.add(new THREE.AmbientLight(0x1e1b4b, 0.3));

    // Atmosphere with very subtle fog
    scene.fog = new THREE.FogExp2(0x02020B, 0.00045);

    // Animation loop for environment
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
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  // Create volumetric mist connections
  useEffect(() => {
    if (!fgRef.current || graphData.links.length === 0) return;
    
    const scene = fgRef.current.scene();
    
    // Clear old mist
    mistLinesRef.current.forEach(mist => {
      scene.remove(mist);
      mist.geometry.dispose();
      (mist.material as THREE.Material).dispose();
    });
    mistLinesRef.current.clear();

    // Wait for positions to be available
    setTimeout(() => {
      if (!fgRef.current) return;

      // Create mist for each edge
      graphData.links.forEach((link, index) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        // Find node objects in scene
        const sourceObj = scene.children.find((obj: any) => obj.__graphObjType === 'node' && obj.__data?.id === sourceId);
        const targetObj = scene.children.find((obj: any) => obj.__graphObjType === 'node' && obj.__data?.id === targetId);
        
        if (!sourceObj || !targetObj) return;
        
        const sourcePos = new THREE.Vector3();
        const targetPos = new THREE.Vector3();
        sourceObj.getWorldPosition(sourcePos);
        targetObj.getWorldPosition(targetPos);
        
        if (!sourcePos || !targetPos) return;

        const mistParticles = 200;
      const positions = new Float32Array(mistParticles * 3);
      const colors = new Float32Array(mistParticles * 3);
      const sizes = new Float32Array(mistParticles);
      const alphas = new Float32Array(mistParticles);

      const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
      const length = direction.length();
      direction.normalize();

      for (let i = 0; i < mistParticles; i++) {
        const t = i / mistParticles;
        
        // Position along curve with organic spread
        const basePoint = sourcePos.clone().lerp(targetPos, t);
        const spreadRadius = Math.sin(t * Math.PI) * 3; // Bulge in middle
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * spreadRadius,
          (Math.random() - 0.5) * spreadRadius,
          (Math.random() - 0.5) * spreadRadius
        );
        
        basePoint.add(randomOffset);
        
        positions[i * 3] = basePoint.x;
        positions[i * 3 + 1] = basePoint.y;
        positions[i * 3 + 2] = basePoint.z;

        // Color gradient along connection
        const color = new THREE.Color();
        color.setHSL(0.65 - t * 0.1, 0.7, 0.5 + t * 0.1);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // Size variation
        sizes[i] = (Math.sin(t * Math.PI) * 2.5 + 1.5) * (Math.random() * 0.5 + 0.75);
        
        // Alpha falloff at edges
        alphas[i] = Math.sin(t * Math.PI) * 0.8 + 0.2;
      }

      const mistGeometry = new THREE.BufferGeometry();
      mistGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      mistGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      mistGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      mistGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

      const mistMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: timeRef.current + index * 0.5 },
        },
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          attribute float alpha;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float time;
          
          void main() {
            vColor = color;
            vAlpha = alpha;
            
            vec3 pos = position;
            
            // Flowing shimmer
            float flow = sin(time * 1.5 + pos.x * 0.05 + pos.z * 0.05) * 0.3;
            pos += vec3(
              sin(time + pos.y * 0.1) * flow,
              cos(time + pos.x * 0.1) * flow,
              sin(time + pos.z * 0.1) * flow
            );
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (250.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            
            if (dist > 0.5) discard;
            
            // Soft gradient
            float alpha = (1.0 - dist * 2.0);
            alpha = pow(alpha, 1.5) * vAlpha * 0.6;
            
            gl_FragColor = vec4(vColor * 1.3, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mist = new THREE.Points(mistGeometry, mistMaterial);
      scene.add(mist);
      
      const edgeKey = `${link.source}-${link.target}`;
      mistLinesRef.current.set(edgeKey, mist);
    });

    // Animate mist
    const animateMist = () => {
      mistLinesRef.current.forEach(mist => {
        const material = mist.material as THREE.ShaderMaterial;
        if (material.uniforms) {
          material.uniforms.time.value += 0.012;
        }
      });
      requestAnimationFrame(animateMist);
    };
    animateMist();
    
    }, 1000); // End setTimeout

  }, [graphData.links, graphData.nodes]);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-250);
      fgRef.current.d3Force('link')?.distance(100);
      fgRef.current.d3Force('center')?.strength(0.15);
    }
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

  return (
    <div ref={containerRef} className="w-full h-full bg-abyss cursor-move">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        backgroundColor="#02020B"
        showNavInfo={false}
        
        nodeLabel="label"
        nodeRelSize={7}
        nodeResolution={24}
        nodeOpacity={1}
        
        nodeThreeObject={(node: any) => {
          const depthIndex = Math.min(node.group, DEPTH_COLORS.length - 1);
          const baseColor = new THREE.Color(DEPTH_COLORS[depthIndex]);
          const isSelected = node.id === selectedNode;
          const isRoot = node.id === rootNode;
          const nodeSize = node.val * 0.45;

          const group = new THREE.Group();

          // Core sphere with refined material
          const coreGeometry = new THREE.SphereGeometry(nodeSize, 32, 32);
          const coreMaterial = new THREE.MeshPhysicalMaterial({
            color: isSelected ? 0xffffff : baseColor,
            emissive: baseColor,
            emissiveIntensity: isSelected ? 0.6 : 0.35,
            roughness: 0.2,
            metalness: 0.8,
            clearcoat: 1.0,
            clearcoatRoughness: 0.15,
            transparent: true,
            opacity: 0.95,
          });
          
          const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
          group.add(coreMesh);

          // Subtle glow sphere
          const glowGeometry = new THREE.SphereGeometry(nodeSize * 1.15, 16, 16);
          const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
              color: { value: baseColor },
              intensity: { value: isSelected ? 0.5 : 0.3 },
            },
            vertexShader: `
              varying vec3 vNormal;
              void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              uniform float intensity;
              varying vec3 vNormal;
              
              void main() {
                float fresnelTerm = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
                gl_FragColor = vec4(color, fresnelTerm * intensity);
              }
            `,
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          
          const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
          group.add(glowMesh);

          // Root node gets subtle ring
          if (isRoot) {
            const ringGeometry = new THREE.TorusGeometry(nodeSize * 1.6, nodeSize * 0.08, 16, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
              color: baseColor,
              transparent: true,
              opacity: 0.5,
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
          }

          // Refined text label
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = 1024;
          canvas.height = 256;

          // Measure text for proper sizing
          ctx.font = 'bold 72px Inter';
          const metrics = ctx.measureText(node.label);
          const textWidth = metrics.width;
          const padding = 60;
          
          // Background with subtle gradient
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(2, 2, 11, 0.85)');
          gradient.addColorStop(1, 'rgba(2, 2, 11, 0.75)');
          ctx.fillStyle = gradient;
          ctx.fillRect(
            (canvas.width - textWidth) / 2 - padding,
            canvas.height / 2 - 80,
            textWidth + padding * 2,
            160
          );

          // Text
          ctx.font = 'bold 72px Inter';
          ctx.fillStyle = isSelected ? '#FFFFFF' : '#F3F4F6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, canvas.width / 2, canvas.height / 2);

          // Subtle underline
          ctx.strokeStyle = baseColor.getStyle();
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo((canvas.width - textWidth) / 2, canvas.height / 2 + 70);
          ctx.lineTo((canvas.width + textWidth) / 2, canvas.height / 2 + 70);
          ctx.stroke();

          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.92,
            depthTest: true,
          });
          
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(nodeSize * 12, nodeSize * 3, 1);
          sprite.position.set(0, nodeSize * 2.2, 0);
          group.add(sprite);

          return group;
        }}

        // Hide default links since we're using mist
        linkVisibility={false}

        onNodeClick={handleNodeClick}
        
        warmupTicks={120}
        cooldownTicks={Infinity}
        cooldownTime={20000}
      />
    </div>
  );
}