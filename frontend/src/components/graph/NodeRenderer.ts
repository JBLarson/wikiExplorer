// frontend/src/components/graph/NodeRenderer.ts
// @refresh reset
import * as THREE from 'three';
import { nodeGlowVertexShader, nodeGlowFragmentShader } from './Shaders';

export interface NodeRenderData {
  id: string;
  label: string;
  group: number;
  importance: number; // 0.0 to 1.0
  degree: number;
  isSelected: boolean;
  isRoot: boolean;
  expansionCount: number;
}

const textureCache = new Map<string, THREE.Texture>();

function getNodeColor(node: NodeRenderData): THREE.Color {
  const depth = Math.min(node.group, 6);
  
  if (node.isRoot) return new THREE.Color(0xF59E0B); // Amber
  if (node.isSelected) return new THREE.Color(0xFFFFFF); // White
  
  const isHub = node.importance > 0.3;
  const baseHue = 270 - (depth * 20); 
  
  const color = new THREE.Color();
  color.setHSL(
    baseHue / 360, 
    isHub ? 0.95 : 0.65, 
    isHub ? 0.75 : 0.6
  );
  return color;
}

function getNodeSize(node: NodeRenderData): number {
  // Base size for a leaf node
  const base = 5; 
  
  // Linear-ish scaling capped at ~6x the base size.
  const multiplier = 1 + (node.importance * 5);
  
  let size = base * multiplier;
  if (node.isRoot) size *= 1.3;
  
  return size;
}

export function createNodeObject(node: NodeRenderData, quality: 'high' | 'low'): THREE.Group {
  const baseColor = getNodeColor(node);
  const nodeSize = getNodeSize(node);
  const group = new THREE.Group();

  // --- 1. SPHERE GEOMETRY ---
  if (quality === 'high') {
    const segments = nodeSize > 15 ? 32 : 16;
    
    // Wireframe
    const wireframe = new THREE.Mesh(
      new THREE.SphereGeometry(nodeSize * 0.5, segments, segments),
      new THREE.MeshBasicMaterial({
        color: baseColor,
        wireframe: true,
        transparent: true,
        opacity: node.isSelected ? 0.5 : 0.15,
      })
    );
    group.add(wireframe);

    // Glow Shader
    const glowScale = 1.2;
    const glowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(nodeSize * 0.5 * glowScale, segments, segments),
      new THREE.ShaderMaterial({
        uniforms: {
          color: { value: baseColor },
          intensity: { value: node.isSelected ? 0.6 : 0.3 + (node.importance * 0.2) },
        },
        vertexShader: nodeGlowVertexShader,
        fragmentShader: nodeGlowFragmentShader,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(glowMesh);
  } else {
    // Low Quality
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(nodeSize * 0.5, 12, 12),
      new THREE.MeshLambertMaterial({ 
        color: baseColor,
        transparent: true,
        opacity: 0.6
      })
    ));
  }

  // --- 2. TEXT LABEL (INSIDE SPHERE) ---
  const cacheKey = `${node.label}-${node.isSelected}`;
  let texture = textureCache.get(cacheKey);

  if (!texture) {
    texture = createTextTexture(node.label, node.isSelected);
    textureCache.set(cacheKey, texture);
  }

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1.0,
    depthTest: false, 
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.renderOrder = 100;

  // Scale: We want the text to fill roughly 90% of the sphere diameter.
  // Since we use a square texture (1024x1024) to center the text, 
  // we just scale the sprite to match the node size.
  const scale = nodeSize * 0.9;
  sprite.scale.set(scale, scale, 1);
  sprite.position.set(0, 0, 0);

  group.add(sprite);

  return group;
}

function createTextTexture(label: string, isSelected: boolean): THREE.Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  // Use a square canvas to make centering inside the sphere mathematically simple
  const size = 1024;
  canvas.width = size;
  canvas.height = size; 

  const fontSize = 110;
  const fontWeight = isSelected ? '900' : '700';
  ctx.font = `${fontWeight} ${fontSize}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // --- Word Wrap Logic ---
  const maxWidth = size * 0.9; // 90% of canvas width
  const words = label.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // --- Drawing ---
  // Center the block of text vertically
  const lineHeight = fontSize * 1.1;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (size - totalTextHeight) / 2 + (lineHeight / 2);

  // Style
  ctx.lineWidth = 12;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'; // Dark outline
  ctx.fillStyle = '#FFFFFF';

  lines.forEach((line, i) => {
    const y = startY + (i * lineHeight);
    ctx.strokeText(line, size / 2, y);
    ctx.fillText(line, size / 2, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.anisotropy = 4; 
  
  return texture;
}