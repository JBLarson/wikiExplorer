// Pure calculation functions for graph operations

export function calculateEdgeDistance(score: number | undefined): number {
  if (typeof score !== 'number') return 150;
  
  // Normalize score if it comes in as 0-100 instead of 0-1
  const normalizedScore = score > 1 ? score / 100 : score;
  
  // Clamp between 0 and 1
  const clampedScore = Math.max(0, Math.min(1, normalizedScore));
  
  // Invert: High score = low distance
  // Base distance: 40 (very close)
  // Max distance added: 260 (total 300)
  return 50 + (1 - clampedScore) * 450;
}

export function normalizeNodeId(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}