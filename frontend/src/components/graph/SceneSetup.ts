// frontend/src/components/graph/SceneSetup.ts
// @refresh reset
import * as THREE from 'three';

/**
 * Creates a simple, performant animated background using a shader-based gradient sphere.
 * This replaces the broken particle star system with something that actually works.
 */
export function createAtmosphericBackground(): {
  background: THREE.Mesh;
  material: THREE.ShaderMaterial;
} {
  // Create a large sphere that encompasses the entire scene
  const geometry = new THREE.SphereGeometry(2000, 32, 32);
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color1: { value: new THREE.Color(0x02020B) }, // Deep abyss
      color2: { value: new THREE.Color(0x1a0b2e) }, // Deep purple
      color3: { value: new THREE.Color(0x0f1729) }, // Navy blue
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      
      // Simple noise function
      float noise(vec3 p) {
        return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
      }
      
      void main() {
        // Normalize position for consistent gradient
        vec3 normPos = normalize(vWorldPosition);
        
        // Create slowly shifting gradient based on position
        float gradient = normPos.y * 0.5 + 0.5;
        
        // Add very subtle animation
        float wave = sin(time * 0.1 + normPos.x * 2.0 + normPos.z * 1.5) * 0.15 + 0.5;
        
        // Mix colors based on gradient and wave
        vec3 color = mix(color1, color2, gradient);
        color = mix(color, color3, wave * 0.3);
        
        // Add very subtle noise for depth
        float noiseVal = noise(normPos * 10.0 + time * 0.05) * 0.03;
        color += noiseVal;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide, // Render inside of sphere
    depthWrite: false,
  });
  
  const background = new THREE.Mesh(geometry, material);
  
  return { background, material };
}

/**
 * Adds subtle accent lights that enhance the atmosphere without performance cost
 */
export function setupLighting(scene: THREE.Scene): void {
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