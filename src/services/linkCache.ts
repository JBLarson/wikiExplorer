import type { WikiLink, GraphEdge } from '../types';

interface NodeLinkCache {
  links: WikiLink[];
  crossEdges: GraphEdge[];
}

class LinkCacheService {
  private cache: Map<string, NodeLinkCache>;

  constructor() {
    this.cache = new Map();
  }

  set(nodeId: string, data: NodeLinkCache): void {
    this.cache.set(nodeId, data);
  }

  get(nodeId: string): NodeLinkCache | undefined {
    return this.cache.get(nodeId);
  }

  has(nodeId: string): boolean {
    return this.cache.has(nodeId);
  }

  clear(): void {
    this.cache.clear();
  }

  delete(nodeId: string): boolean {
    return this.cache.delete(nodeId);
  }

  size(): number {
    return this.cache.size;
  }
}

export const linkCache = new LinkCacheService();