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
  const base = 12; 
  const multiplier = 1 + (node.importance * 4);
  
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
    const segments = nodeSize > 25 ? 32 : 16;
    
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

  // --- 2. TEXT LABEL ---
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
  
  // Tag it for the hover animation loop
  sprite.name = 'label'; 

  // Scale calculations
  const image = texture.image as HTMLCanvasElement;
  const aspect = image.width / image.height;
  const textHeight = nodeSize * 0.7; 
  
  // Set initial scale
  sprite.scale.set(textHeight * aspect, textHeight, 1);
  sprite.position.set(0, 0, 0);

  // Store the base scale in userData so we can smoothly animate back to it
  sprite.userData = {
    baseScale: new THREE.Vector3(textHeight * aspect, textHeight, 1)
  };

  group.add(sprite);

  return group;
}

/**
 * Creates a texture for the node label.
 * Includes an auto-scaling algorithm to ensure long words (like "Telecommunications")
 * shrink to fit the canvas width instead of being clipped.
 */
function createTextTexture(label: string, isSelected: boolean): THREE.Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  const size = 1024;
  canvas.width = size;
  canvas.height = size; 

  // Initial Configuration
  let fontSize = 130;
  const fontWeight = isSelected ? '900' : '700';
  const fontFamily = 'Inter, sans-serif';
  const maxWidth = size * 0.9; // 90% of canvas width

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const setFont = (s: number) => {
    ctx.font = `${fontWeight} ${s}px ${fontFamily}`;
  };

  // --- Auto-Scaling & Word Wrap Logic ---
  const words = label.split(' ');
  let lines: string[] = [];

  // Helper to calculate lines based on current fontSize
  const calculateLayout = (): number => {
    lines = [];
    let currentLine = '';
    let currentMaxLineWidth = 0;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        // Push current line
        lines.push(currentLine);
        const lineMetrics = ctx.measureText(currentLine);
        if (lineMetrics.width > currentMaxLineWidth) currentMaxLineWidth = lineMetrics.width;
        
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
      const lineMetrics = ctx.measureText(currentLine);
      if (lineMetrics.width > currentMaxLineWidth) currentMaxLineWidth = lineMetrics.width;
    }
    
    // Also check if any single word in the final lines exceeds max width
    // (This catches the "Telecommunications" case)
    return currentMaxLineWidth;
  };

  // Initial Calculation
  setFont(fontSize);
  let computedWidth = calculateLayout();

  // Recursively shrink font if text is too wide
  // We set a hard floor at 40px to prevent unreadable text
  while (computedWidth > maxWidth && fontSize > 40) {
    fontSize -= 5;
    setFont(fontSize);
    computedWidth = calculateLayout();
  }

  // --- Drawing ---
  const lineHeight = fontSize * 1.1;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (size - totalTextHeight) / 2 + (lineHeight / 2);

  // Scaled outline width
  ctx.lineWidth = fontSize * 0.1;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)'; 
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