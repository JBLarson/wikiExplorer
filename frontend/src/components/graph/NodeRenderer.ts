// frontend/src/components/graph/NodeRenderer.ts
import * as THREE from 'three';
import { nodeGlowVertexShader, nodeGlowFragmentShader } from './Shaders';

const DEPTH_COLORS = [
  0xA855F7, 0x6366F1, 0x3B82F6, 0x10B981,
];

interface NodeRenderData {
  id: string;
  label: string;
  group: number;
  val: number;
  isSelected: boolean;
  isRoot: boolean;
}

// ✅ PERFORMANCE: Cache textures to avoid recreating canvases
const textureCache = new Map<string, THREE.Texture>();

export function createNodeObject(node: NodeRenderData): THREE.Group {
  const depthIndex = Math.min(node.group, DEPTH_COLORS.length - 1);
  const baseColor = new THREE.Color(DEPTH_COLORS[depthIndex]);
  const nodeSize = node.val * 0.45;
  const group = new THREE.Group();

  // Wireframe sphere
  const wireframeGeometry = new THREE.SphereGeometry(nodeSize, 7, 7);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: node.isSelected ? 0xffffff : baseColor,
    wireframe: true,
    transparent: true,
    opacity: node.isSelected ? 0.9 : 0.7,
  });
  
  const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  group.add(wireframeMesh);

  // Glow sphere
  const glowGeometry = new THREE.SphereGeometry(nodeSize * 1.15, 16, 16);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: baseColor },
      intensity: { value: node.isSelected ? 0.5 : 0.25 },
    },
    vertexShader: nodeGlowVertexShader,
    fragmentShader: nodeGlowFragmentShader,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  
  const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glowMesh);

  // Text sprite (CACHED)
  const cacheKey = `${node.label}-${nodeSize}-${node.isSelected}`;
  let texture = textureCache.get(cacheKey);
  
  if (!texture) {
    texture = createTextTexture(node.label, baseColor, nodeSize, node.isSelected);
    textureCache.set(cacheKey, texture);
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
  isSelected: boolean
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
  ctx.fillStyle = isSelected ? '#FFFFFF' : '#F3F4F6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color.getStyle();
  ctx.shadowBlur = 15;

  const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}

export { DEPTH_COLORS };