// frontend/src/components/graph/NodeRenderer.ts
// @refresh reset
import * as THREE from 'three';
import { nodeGlowVertexShader, nodeGlowFragmentShader } from './Shaders';

interface NodeRenderData {
  id: string;
  label: string;
  group: number;
  val: number;
  isSelected: boolean;
  isRoot: boolean;
  expansionCount?: number;
}

// Cache textures to avoid recreating canvases
const textureCache = new Map<string, THREE.Texture>();

function getNodeColor(node: NodeRenderData): THREE.Color {
  const depth = Math.min(node.group, 6);
  
  if (node.isRoot) {
    return new THREE.Color(0xF59E0B); // Amber
  }
  
  if (node.isSelected) {
    return new THREE.Color(0xFFFFFF); // White
  }
  
  const expansionCount = node.expansionCount || 0;
  const isImportant = expansionCount >= 2;
  
  const baseHue = 280 - (depth * 27);
  const baseSaturation = 0.7 + (depth * 0.04);
  const baseLightness = 0.65 - (depth * 0.06);
  
  const saturation = isImportant ? Math.min(baseSaturation + 0.15, 1.0) : baseSaturation;
  const lightness = isImportant ? Math.min(baseLightness + 0.1, 0.8) : baseLightness;
  
  const color = new THREE.Color();
  color.setHSL(baseHue / 360, saturation, lightness);
  
  return color;
}

function getGlowIntensity(node: NodeRenderData): number {
  if (node.isSelected) return 0.8;
  if (node.isRoot) return 0.6;
  
  const expansionCount = node.expansionCount || 0;
  if (expansionCount >= 2) return 0.4;
  if (expansionCount === 1) return 0.3;
  
  return 0.2;
}

export function createNodeObject(node: NodeRenderData, quality: 'high' | 'low'): THREE.Group {
  const baseColor = getNodeColor(node);
  const nodeSize = node.val * 0.45;
  const group = new THREE.Group();

  // --- MESH RENDERER ---
  if (quality === 'high') {
    // 1. Wireframe
    const wireframeGeometry = new THREE.SphereGeometry(nodeSize, 7, 7);
    const wireframeOpacity = node.isSelected ? 1.0 : 
                             node.isRoot ? 0.9 :
                             (node.expansionCount || 0) >= 1 ? 0.8 : 0.7;
    
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: baseColor,
      wireframe: true,
      transparent: true,
      opacity: wireframeOpacity,
    });
    group.add(new THREE.Mesh(wireframeGeometry, wireframeMaterial));

    // 2. Glow Shader
    const glowGeometry = new THREE.SphereGeometry(nodeSize * 1.15, 16, 16);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: baseColor },
        intensity: { value: getGlowIntensity(node) },
      },
      vertexShader: nodeGlowVertexShader,
      fragmentShader: nodeGlowFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(glowGeometry, glowMaterial));
  } else {
    // Low Quality: Simple solid sphere
    const geometry = new THREE.SphereGeometry(nodeSize, 8, 8); 
    const material = new THREE.MeshLambertMaterial({
      color: baseColor,
      transparent: true,
      opacity: node.isSelected || node.isRoot ? 1.0 : 0.8,
    });
    group.add(new THREE.Mesh(geometry, material));
  }

  // --- TEXT SPRITE ---
  // Update cache key to include quality setting so we don't serve white text in low mode
  const cacheKey = `${node.label}-${nodeSize}-${node.isSelected}-${node.isRoot}-${quality}`;
  let texture = textureCache.get(cacheKey);
  
  if (!texture) {
    texture = createTextTexture(
      node.label, 
      baseColor, 
      nodeSize, 
      node.isSelected || node.isRoot, 
      quality
    );
    textureCache.set(cacheKey, texture);
    
    if (textureCache.size > 200) {
      const firstKey = Array.from(textureCache.keys())[0];
      if (firstKey) {
        const oldTexture = textureCache.get(firstKey);
        if (oldTexture) oldTexture.dispose();
        textureCache.delete(firstKey);
      }
    }
  }

  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  const spriteSizeRatio = 1.6;
  sprite.scale.set(nodeSize * spriteSizeRatio, nodeSize * spriteSizeRatio, 1);
  sprite.position.set(0, 0, 0);
  group.add(sprite);

  return group;
}

function createTextTexture(
  label: string,
  color: THREE.Color,
  nodeSize: number,
  isHighlighted: boolean,
  quality: 'high' | 'low' // Added quality param
): THREE.Texture {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 512;

  const maxWidth = canvas.width * 0.8;
  const maxHeight = canvas.height * 0.8;
  let fontSize = 72;
  
  const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
    ctx.font = `bold ${fontSize}px Inter`;
    const words = text.split(' ');
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
    return lines;
  };

  let lines = wrapText(label, maxWidth, fontSize);
  let lineHeight = fontSize * 1.2;
  let totalHeight = lines.length * lineHeight;

  while (totalHeight > maxHeight && fontSize > 20) {
    fontSize -= 4;
    lines = wrapText(label, maxWidth, fontSize);
    lineHeight = fontSize * 1.2;
    totalHeight = lines.length * lineHeight;
  }

  ctx.font = `bold ${fontSize}px Inter`;
  const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
  if (maxLineWidth > maxWidth) {
    fontSize = fontSize * (maxWidth / maxLineWidth);
    lines = wrapText(label, maxWidth, fontSize);
    lineHeight = fontSize * 1.2;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize}px Inter`;
  
  // --- COLOR LOGIC FIX ---
  if (quality === 'low' && isHighlighted) {
    // In low quality, highlighted nodes are solid bright spheres -> Use Black Text
    ctx.fillStyle = '#000000';
  } else {
    // In high quality (wireframe) or unselected low quality -> Use White/Grey Text
    ctx.fillStyle = isHighlighted ? '#FFFFFF' : '#F3F4F6';
  }
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Remove shadow for black text to make it crisper
  if (!(quality === 'low' && isHighlighted)) {
    ctx.shadowColor = color.getStyle();
    ctx.shadowBlur = isHighlighted ? 20 : 15;
  }

  const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}

export function getDepthColor(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  const saturation = 70 + (depth * 4);
  const lightness = 65 - (depth * 6);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getDepthDescription(depth: number): string {
  const descriptions = [
    'Root Topic',
    'Direct Connections',
    'Secondary Relations',
    'Tertiary Context',
    'Extended Network',
    'Peripheral Topics',
    'Deep Exploration',
  ];
  return descriptions[Math.min(depth, descriptions.length - 1)];
}