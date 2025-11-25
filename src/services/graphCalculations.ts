// Pure calculation functions for graph operations

export function calculateEdgeDistance(score: number | undefined): number {
  if (typeof score !== 'number') return 150;
  
  // Normalize score if it comes in as 0-100 instead of 0-1
  const normalizedScore = Math.min(score / 25, 1.0);
    
  // Invert: High score = low distance
  // Base distance: 40 (very close)
  // Max distance added: 260 (total 300)
  return 40 + (1 - normalizedScore) * 260;
}

export function normalizeNodeId(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}