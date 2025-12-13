//frontend/src/components/graph2d/GraphSettings.ts


import { Settings } from 'sigma/settings';

export const SIGMA_SETTINGS: Partial<Settings> = {
  // --- High-Performance Rendering ---
  renderLabels: true,
  
  // Lower threshold so labels appear when zoomed out
  labelRenderedSizeThreshold: 5, 
  
  // "0.5" allows more labels to overlap slightly before being hidden.
  labelDensity: 0.5,
  labelGridCellSize: 60,
  
  labelFont: "Inter, sans-serif",
  labelWeight: "600",
  zIndex: true,
  
  // --- Visual Polish ---
  defaultNodeType: "circle",
  defaultEdgeType: "arrow", 
  
  // CRITICAL FIX: 
  // We tell Sigma to look for a node attribute named "labelColor".
  // If the node doesn't have one, it falls back to the "color" property defined here (#E2E8F0).
  labelColor: { attribute: "labelColor", color: "#E2E8F0" },
};

export const LAYOUT_SETTINGS = {
  settings: {
    // --- Anchor-Based Physics ---
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

// High Contrast Palette
export const NODE_PALETTE = [
  '#F59E0B', // Root (Amber-500)
  '#D946EF', // L1 (Fuchsia-500)
  '#8B5CF6', // L2 (Violet-500)
  '#3B82F6', // L3 (Blue-500)
  '#06B6D4', // L4 (Cyan-500)
  '#10B981', // L5 (Emerald-500)
  '#84CC16', // L6 (Lime-500)
];

export const DEFAULT_NODE_COLOR = '#64748B'; // Slate-500