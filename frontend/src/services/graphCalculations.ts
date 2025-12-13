// frontend/src/services/graphCalculations.ts

export function calculateEdgeDistance(score: number | undefined): number {
  if (typeof score !== 'number') return 200; // Base distance increased
  const normalizedScore = Math.min(score / 25, 1.0);
  // Range: 50 (Very close/high score) to 300 (Far/low score)
  return 50 + (1 - normalizedScore) * 300;
}

export function calculateEdgeStrength(score: number | undefined): number {
  if (typeof score !== 'number') return 1.0;
  const normalizedScore = Math.min(score / 25, 1.0);
  return 0.3 + (normalizedScore * 1.7);
}

export function normalizeNodeId(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_');
}