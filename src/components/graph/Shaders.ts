// @refresh reset
export const starVertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float time;
  
  void main() {
    vColor = color;
    
    // Twinkle effect
    float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.5 + 0.5;
    vAlpha = twinkle * 0.4 + 0.3;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const starFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = (1.0 - dist * 2.0) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export const mistVertexShader = `
  attribute float size;
  attribute vec3 color;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float time;
  
  void main() {
    vColor = color;
    vAlpha = alpha;
    
    vec3 pos = position;
    
    // Flowing shimmer
    float flow = sin(time * 1.5 + pos.x * 0.05 + pos.z * 0.05) * 0.3;
    pos += vec3(
      sin(time + pos.y * 0.1) * flow,
      cos(time + pos.x * 0.1) * flow,
      sin(time + pos.z * 0.1) * flow
    );
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const mistFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    // Soft gradient
    float alpha = (1.0 - dist * 2.0);
    alpha = pow(alpha, 1.5) * vAlpha * 0.6;
    
    gl_FragColor = vec4(vColor * 1.3, alpha);
  }
`;

export const nodeGlowVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nodeGlowFragmentShader = `
  uniform vec3 color;
  uniform float intensity;
  varying vec3 vNormal;
  
  void main() {
    float fresnelTerm = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    gl_FragColor = vec4(color, fresnelTerm * intensity);
  }
`;