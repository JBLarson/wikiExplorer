export function calculateEdgeDistance(score: number | undefined): number {
  if (typeof score !== 'number') return 150;
  const normalizedScore = Math.min(score / 25, 1.0);
  return 40 + (1 - normalizedScore) * 260;
}

export function calculateEdgeStrength(score: number | undefined): number {
  if (typeof score !== 'number') return 1.0;
  const normalizedScore = Math.min(score / 25, 1.0);
  return 0.3 + (normalizedScore * 1.7);
}

export function normalizeNodeId(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}