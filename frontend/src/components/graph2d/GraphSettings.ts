//frontend/src/components/graph2d/GraphSettings.ts


import { Settings } from 'sigma/settings';

export const SIGMA_SETTINGS: Partial<Settings> = {
  // --- High-Performance Rendering ---
  renderLabels: true,
  
  // CRITICAL FIX: Lower threshold so labels appear when zoomed out
  labelRenderedSizeThreshold: 5, 
  
  // Label Density Optimization:
  // "0.5" allows more labels to overlap slightly before being hidden.
  // This makes the graph feel "denser" with information at a distance.
  labelDensity: 0.5,
  labelGridCellSize: 60,
  
  labelFont: "Inter, sans-serif",
  labelWeight: "600",
  zIndex: true,
  
  // --- Visual Polish ---
  defaultNodeType: "circle",
  defaultEdgeType: "arrow", // Arrows show flow better than lines
  labelColor: { color: "#E2E8F0" }, // Light Slate (High Contrast on Dark)
};

export const LAYOUT_SETTINGS = {
  settings: {
    // --- Anchor-Based Physics ---
    // Since Root is fixed at (0,0), we can use stronger gravity 
    // to pull everything into a tight, readable orbit without drift.
    gravity: 1,               
    scalingRatio: 25,         // Good spacing between clusters
    barnesHutOptimize: true,  
    barnesHutTheta: 0.6,
    slowDown: 10,             // High friction = Zero Jitter
    outboundAttractionDistribution: true, 
    edgeWeightInfluence: 0,
    strongGravityMode: false  
  },
  iterations: 100, 
};

// High Contrast Palette (Tested against #02020B background)
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