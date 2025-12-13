//frontend/src/components/graph2d/GraphSettings.ts


import { Settings } from 'sigma/settings';

export const SIGMA_SETTINGS: Partial<Settings> = {
  // --- Rendering Performance ---
  renderLabels: true,
  labelRenderedSizeThreshold: 5, 
  labelDensity: 0.5,
  labelGridCellSize: 60,
  labelFont: "Inter, sans-serif",
  labelWeight: "600",
  zIndex: true,
  
  // --- Robustness ---
  allowInvalidContainer: true,
  
  // --- Visuals ---
  // Note: We intentionally omit 'defaultNodeType'.
  // This forces Sigma to use its built-in point renderer.
  defaultEdgeType: "arrow", 
  
  labelColor: { attribute: "labelColor", color: "#E2E8F0" },
};

export const LAYOUT_SETTINGS = {
  settings: {
    // --- Physics Tuning ---
    gravity: 1,               
    scalingRatio: 25,         
    barnesHutOptimize: true,  
    barnesHutTheta: 0.6,
    slowDown: 10,             
    outboundAttractionDistribution: true, 
    edgeWeightInfluence: 0,
    strongGravityMode: false  
  },
  iterations: 100, 
};

export const NODE_PALETTE = [
  '#F59E0B', 
  '#D946EF', 
  '#8B5CF6', 
  '#3B82F6', 
  '#06B6D4', 
  '#10B981', 
  '#84CC16', 
];

export const DEFAULT_NODE_COLOR = '#64748B';