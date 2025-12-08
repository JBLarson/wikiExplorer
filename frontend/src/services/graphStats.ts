// frontend/src/services/graphStats.ts
import type { GraphNode, GraphEdge } from '../types';

export interface NodeStats {
  degree: number;
  inDegree: number;
  outDegree: number;
  neighborConnectivity: number;
  importance: number; // 0.0 to 1.0 normalized score
}

export function calculateGraphStats(nodes: GraphNode[], edges: GraphEdge[]): Map<string, NodeStats> {
  const stats = new Map<string, NodeStats>();
  const nodeEdgeMap = new Map<string, GraphEdge[]>();
  
  // Initialize
  nodes.forEach(node => {
    stats.set(node.id, {
      degree: 0,
      inDegree: 0,
      outDegree: 0,
      neighborConnectivity: 0,
      importance: 0
    });
    nodeEdgeMap.set(node.id, []);
  });

  // Pass 1: Basic Degree Calculation
  edges.forEach(edge => {
    const sourceStats = stats.get(edge.source);
    const targetStats = stats.get(edge.target);

    if (sourceStats) {
      sourceStats.outDegree++;
      sourceStats.degree++;
      nodeEdgeMap.get(edge.source)?.push(edge);
    }
    if (targetStats) {
      targetStats.inDegree++;
      targetStats.degree++;
      nodeEdgeMap.get(edge.target)?.push(edge);
    }
  });

  // Pass 2: Neighbor Connectivity (Second-order connectivity)
  // A node is important if it connects to other highly connected nodes.
  let maxImportance = 0;

  nodes.forEach(node => {
    const myStats = stats.get(node.id)!;
    const myEdges = nodeEdgeMap.get(node.id) || [];
    
    // Calculate sum of degrees of all neighbors
    const neighborIds = new Set<string>();
    myEdges.forEach(e => {
      const neighborId = e.source === node.id ? e.target : e.source;
      neighborIds.add(neighborId);
    });

    let connectivitySum = 0;
    neighborIds.forEach(nid => {
      const nStats = stats.get(nid);
      if (nStats) {
        connectivitySum += nStats.degree;
      }
    });

    myStats.neighborConnectivity = connectivitySum;

    // Calculate Raw Importance Score
    // Weighting: Degree (60%) + Neighbor Connectivity (40%)
    // We use Log scale to prevent massive hubs from dwarfing everything
    const rawScore = (myStats.degree * 1.5) + (Math.sqrt(connectivitySum) * 2);
    
    myStats.importance = rawScore;
    if (rawScore > maxImportance) maxImportance = rawScore;
  });

  // Pass 3: Normalize Importance (0.0 - 1.0)
  // We use a non-linear curve so top nodes pop out, but bottom nodes don't vanish
  if (maxImportance > 0) {
    nodes.forEach(node => {
      const s = stats.get(node.id)!;
      // Linear normalize first
      const linear = s.importance / maxImportance;
      // Then apply power curve to accentuate differences (0.5 becomes 0.25, 1.0 stays 1.0)
      // Actually, standardizing around a baseline size is safer
      s.importance = linear; 
    });
  }

  return stats;
}