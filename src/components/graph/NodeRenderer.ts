import * as THREE from 'three';
import { nodeGlowVertexShader, nodeGlowFragmentShader } from './Shaders';

const DEPTH_COLORS = [
  0xA855F7, // Depth 1: Purple
  0x6366F1, // Depth 2: Indigo
  0x3B82F6, // Depth 3: Blue
  0x10B981, // Depth 4+: Emerald
];

interface NodeRenderData {
  id: string;
  label: string;
  group: number;
  val: number;
  isSelected: boolean;
  isRoot: boolean;
}



export function createNodeObject(node: NodeRenderData): THREE.Group {
  const depthIndex = Math.min(node.group, DEPTH_COLORS.length - 1);
  const baseColor = new THREE.Color(DEPTH_COLORS[depthIndex]);
  const nodeSize = node.val * 0.45;

  const group = new THREE.Group();

  // Wireframe sphere instead of solid
  const wireframeGeometry = new THREE.SphereGeometry(nodeSize, 7, 7);
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: node.isSelected ? 0xffffff : baseColor,
    wireframe: true,
    transparent: true,
    opacity: node.isSelected ? 0.9 : 0.7,
  });
  
  const wireframeMesh = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
  group.add(wireframeMesh);

  // Subtle glow sphere (keep this for depth)
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



  // Text label INSIDE the sphere
  const sprite = createTextSprite(node.label, baseColor, nodeSize, node.isSelected);
  sprite.position.set(0, 0, 0);  // Center it inside the sphere
  group.add(sprite);

  return group;
}





function createTextSprite(
  label: string,
  color: THREE.Color,
  nodeSize: number,
  isSelected: boolean
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = 512;
  canvas.height = 512;

  // Calculate max dimensions (80% of sphere diameter to stay inside)
  const maxWidth = canvas.width * 0.8;
  const maxHeight = canvas.height * 0.8;

  // Start with a base font size
  let fontSize = 72;
  
  // Helper function to wrap text into lines
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
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // Try to fit text with wrapping
  let lines = wrapText(label, maxWidth, fontSize);
  let lineHeight = fontSize * 1.2;
  let totalHeight = lines.length * lineHeight;

  // Scale down if total height exceeds max
  while (totalHeight > maxHeight && fontSize > 20) {
    fontSize -= 4;
    lines = wrapText(label, maxWidth, fontSize);
    lineHeight = fontSize * 1.2;
    totalHeight = lines.length * lineHeight;
  }

  // If still too wide after wrapping, scale down more
  ctx.font = `bold ${fontSize}px Inter`;
  const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
  if (maxLineWidth > maxWidth) {
    fontSize = fontSize * (maxWidth / maxLineWidth);
    lines = wrapText(label, maxWidth, fontSize);
    lineHeight = fontSize * 1.2;
    totalHeight = lines.length * lineHeight;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw each line centered
  ctx.font = `bold ${fontSize}px Inter`;
  ctx.fillStyle = isSelected ? '#FFFFFF' : '#F3F4F6';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Subtle glow for readability through wireframe
  ctx.shadowColor = color.getStyle();
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Calculate starting Y position to center all lines vertically
  const startY = (canvas.height - totalHeight) / 2 + lineHeight / 2;
  
  lines.forEach((line, index) => {
    const y = startY + (index * lineHeight);
    ctx.fillText(line, canvas.width / 2, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
  
  const sprite = new THREE.Sprite(spriteMaterial);
  
  // Scale sprite to fit within node
  const spriteSizeRatio = 1.6;
  sprite.scale.set(nodeSize * spriteSizeRatio, nodeSize * spriteSizeRatio, 1);
  
  return sprite;
}



export { DEPTH_COLORS };