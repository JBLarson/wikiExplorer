// frontend/src/components/graph/SceneSetup.ts
// @refresh reset
import * as THREE from 'three';

/**
 * OPTIMIZED: Removed the expensive shader-based sphere.
 * We now rely on the canvas background color for the void.
 */
export function createAtmosphericBackground(): {
  background: THREE.Mesh | null; // Allow null
  material: THREE.Material | null;
} {
  // We return null here to stop creating geometry.
  // The dark color is now handled by the graph component directly.
  return { background: null, material: null };
}

/**
 * Adds subtle accent lights that enhance the atmosphere without performance cost
 */
export function setupLighting(scene: THREE.Scene, nodeCount: number): void {

  if (nodeCount === 0) return;

  // Key light - purple accent
  const keyLight = new THREE.DirectionalLight(0x8b5cf6, 0.6);
  keyLight.position.set(100, 200, 100);
  scene.add(keyLight);
  
  // Fill light - blue accent
  const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.3);
  fillLight.position.set(-100, -50, -100);
  scene.add(fillLight);
  
  // Back light - indigo accent
  const backLight = new THREE.DirectionalLight(0x6366f1, 0.4);
  backLight.position.set(0, 50, -200);
  scene.add(backLight);
  
  // Ambient light - very dim to preserve dark theme
  scene.add(new THREE.AmbientLight(0x1e1b4b, 0.2));
}

/**
 * Exponential fog for depth perception
 */
export function setupFog(scene: THREE.Scene): void {
  scene.fog = new THREE.FogExp2(0x02020B, 0.00035);
}