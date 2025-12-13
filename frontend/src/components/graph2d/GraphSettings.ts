//frontend/src/components/graph2d/GraphSettings.ts

import { Settings } from 'sigma/settings';

export const SIGMA_SETTINGS: Partial<Settings> = {
  // --- Rendering Optimization ---
  renderLabels: true,
  labelRenderedSizeThreshold: 9, // Labels appear sooner (better UX)
  labelDensity: 0.07,
  labelGridCellSize: 60,
  labelFont: "Inter, sans-serif",
  labelWeight: "600",
  zIndex: true,
  
  // --- Visual Style ---
  defaultNodeType: "circle",
  defaultEdgeType: "line",
  labelColor: { color: "#FFFFFF" },
  
  // Note: hoverRenderer is handled via InteractionLayer reducers
};

export const LAYOUT_SETTINGS = {
  settings: {
    // --- STABILIZED PHYSICS CONFIGURATION ---
    gravity: 1,               // Standard gravity to hold the core
    scalingRatio: 15,         // Moderate expansion (prevents flying off screen)
    barnesHutOptimize: true,  // Performance for large graphs
    barnesHutTheta: 0.6,
    slowDown: 3,              // High friction (dampens oscillation/bouncing)
    outboundAttractionDistribution: true, // Key for "Star" topology
    edgeWeightInfluence: 0,
    strongGravityMode: false  // Disabled to prevent implosion
  },
  iterations: 100, // Initial warm-up ticks
};

export const NODE_PALETTE = [
  '#F59E0B', // Root (Amber)
  '#D946EF', // L1 (Fuchsia)
  '#8B5CF6', // L2 (Violet)
  '#3B82F6', // L3 (Blue)
  '#06B6D4', // L4 (Cyan)
  '#10B981', // L5 (Emerald)
  '#84CC16', // L6 (Lime)
];

export const DEFAULT_NODE_COLOR = '#64748B'; // Slate 500