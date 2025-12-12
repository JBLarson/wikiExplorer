import { Settings } from 'sigma/settings';

// Explicitly typed as Partial<Settings> to catch invalid keys
export const SIGMA_SETTINGS: Partial<Settings> = {
  // Performance optimizations
  renderLabels: true,
  labelRenderedSizeThreshold: 6, // Only show labels when zoomed in
  labelFont: "Inter, sans-serif",
  zIndex: true,
  
  // Visual Style
  defaultNodeType: "circle",
  defaultEdgeType: "line",
  labelColor: { color: "#FFFFFF" },
  
  // FIXED: Removed 'enableHovering' and 'enableEdgeHoverEvents' 
  // as they are no longer valid in the strict Settings type for this version.
  // Hovering is generally handled automatically by the interaction layer now.
};

export const LAYOUT_SETTINGS = {
  settings: {
    // Physics parameters for "Star-Bus" topology
    gravity: 0.5,           // Pulls disconnected components to center
    scalingRatio: 10,       // Expands the graph to avoid overlap
    barnesHutOptimize: true,// O(n log n) algorithm for large graphs
    barnesHutTheta: 0.5,
    slowDown: 10,           // Stabilization dampening
    strongGravityMode: false,
    outboundAttractionDistribution: true // IMPORTANT: Distributes leaf nodes radially
  },
  iterations: 100, // Initial layout ticks
};

export const NODE_PALETTE = [
  '#F59E0B', // Depth 0 (Root) - Amber
  '#A855F7', // Depth 1 - Purple
  '#3B82F6', // Depth 2 - Blue
  '#06B6D4', // Depth 3 - Cyan
  '#10B981', // Depth 4 - Emerald
  '#84CC16', // Depth 5 - Lime
  '#EAB308', // Depth 6 - Yellow
];

export const DEFAULT_NODE_COLOR = '#9CA3AF';