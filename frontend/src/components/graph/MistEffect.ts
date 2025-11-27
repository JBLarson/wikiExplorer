// @refresh reset
import * as THREE from 'three';
import { mistVertexShader, mistFragmentShader } from './Shaders';

interface MistConfig {
  particleCount: number;
  spreadRadius: number;
  baseSize: number;
}

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);


const DEFAULT_CONFIG: MistConfig = {
  particleCount: isMobile ? 150 : 300,
  spreadRadius: 3,
  baseSize: 2,
};

export function createMistConnection(
  sharedTimeUniform: { value: number }, // Pass the shared time object
  config: Partial<MistConfig> = {}
): THREE.Points {
  const { particleCount, spreadRadius, baseSize } = { ...DEFAULT_CONFIG, ...config };
  
  // Attributes
  const positions = new Float32Array(particleCount * 3); // Used for dummy positions (required by Three.js)
  const offsets = new Float32Array(particleCount * 3);   // The random spread
  const ts = new Float32Array(particleCount);            // 0 to 1 progress along line
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const alphas = new Float32Array(particleCount);
  const timeOffsets = new Float32Array(particleCount);

  const edgeTimeOffset = Math.random() * 100; // Random offset for this specific edge

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    ts[i] = t;
    
    // Calculate random spread offset (Isotropic cloud)
    const spread = Math.sin(t * Math.PI) * spreadRadius; // Bulge in middle
    
    offsets[i * 3] = (Math.random() - 0.5) * spread;
    offsets[i * 3 + 1] = (Math.random() - 0.5) * spread;
    offsets[i * 3 + 2] = (Math.random() - 0.5) * spread;

    // Color gradient
    const color = new THREE.Color();
    color.setHSL(0.65 - t * 0.1, 0.9, 0.7 + t * 0.1);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Size variation
    sizes[i] = (Math.sin(t * Math.PI) * baseSize + 1.5) * (Math.random() * 0.5 + 0.75);
    
    // Alpha falloff
    alphas[i] = Math.sin(t * Math.PI) * 0.95 + 0.4;

    // Per-particle time offset for shimmering
    timeOffsets[i] = edgeTimeOffset + Math.random();
  }

  const mistGeometry = new THREE.BufferGeometry();
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mistGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 3));
  mistGeometry.setAttribute('t', new THREE.BufferAttribute(ts, 1));
  mistGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mistGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  mistGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  mistGeometry.setAttribute('timeOffset', new THREE.BufferAttribute(timeOffsets, 1));

  const mistMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: sharedTimeUniform, // Link to global time
      startPos: { value: new THREE.Vector3() },
      endPos: { value: new THREE.Vector3() },
    },
    vertexShader: mistVertexShader,
    fragmentShader: mistFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mist = new THREE.Points(mistGeometry, mistMaterial);
  
  // IMPORTANT: Prevent frustum culling. 
  // Since we move the points in the vertex shader based on uniforms, 
  // Three.js's bounding sphere calculation based on the (0,0,0) 'position' attribute 
  // will be wrong, causing the mist to disappear when the origin is off-screen.
  mist.frustumCulled = false;

  return mist;
}