import * as THREE from 'three';
import { mistVertexShader, mistFragmentShader } from './Shaders';

interface MistConfig {
  particleCount: number;
  spreadRadius: number;
  baseSize: number;
}

const DEFAULT_CONFIG: MistConfig = {
  particleCount: 200,
  spreadRadius: 3,
  baseSize: 2,
};

export function createMistConnection(
  sourcePos: THREE.Vector3,
  targetPos: THREE.Vector3,
  timeOffset: number,
  config: Partial<MistConfig> = {}
): THREE.Points {
  const { particleCount, spreadRadius, baseSize } = { ...DEFAULT_CONFIG, ...config };
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const alphas = new Float32Array(particleCount);

  const direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
  const length = direction.length();
  direction.normalize();

  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    
    // Position along curve with organic spread
    const basePoint = sourcePos.clone().lerp(targetPos, t);
    const spread = Math.sin(t * Math.PI) * spreadRadius; // Bulge in middle
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread
    );
    
    basePoint.add(randomOffset);
    
    positions[i * 3] = basePoint.x;
    positions[i * 3 + 1] = basePoint.y;
    positions[i * 3 + 2] = basePoint.z;

    // Color gradient along connection
    const color = new THREE.Color();
    color.setHSL(0.65 - t * 0.1, 0.9, 0.7 + t * 0.1);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // Size variation
    sizes[i] = (Math.sin(t * Math.PI) * baseSize + 1.5) * (Math.random() * 0.5 + 0.75);
    
    // Alpha falloff at edges
    alphas[i] = Math.sin(t * Math.PI) * 0.95 + 0.4;
  }

  const mistGeometry = new THREE.BufferGeometry();
  mistGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  mistGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mistGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  mistGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

  const mistMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: timeOffset },
    },
    vertexShader: mistVertexShader,
    fragmentShader: mistFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(mistGeometry, mistMaterial);
}

export function animateMist(mistConnections: Map<string, THREE.Points>, deltaTime: number): void {
  mistConnections.forEach(mist => {
    const material = mist.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.time.value += deltaTime;
    }
  });
}