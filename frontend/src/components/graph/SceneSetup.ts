// @refresh reset
import * as THREE from 'three';
import { starVertexShader, starFragmentShader } from './Shaders';

export function createAtmosphericParticles(): {
  stars: THREE.Points;
  material: THREE.ShaderMaterial;
} {
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
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  
  return { stars, material: starMaterial };
}

export function setupLighting(scene: THREE.Scene): void {
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
}

export function setupFog(scene: THREE.Scene): void {
  scene.fog = new THREE.FogExp2(0x02020B, 0.00045);
}