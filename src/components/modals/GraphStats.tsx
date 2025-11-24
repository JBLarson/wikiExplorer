import { XMarkIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import type { GraphNode, GraphEdge } from '../../types';

interface GraphStatsModalProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
}

interface NodeWithStats extends GraphNode {
  edgeCount: number;
  incomingEdges: number;
  outgoingEdges: number;
  neighborConnectivity: number; // Sum of edges held by this node's neighbors
}

export function GraphStatsModal({ nodes, edges, onClose, onNodeClick }: GraphStatsModalProps) {
  const nodesWithStats = useMemo(() => {
    // 1. Create a map of NodeID -> Connected Edge Indices for O(1) lookup
    // This prevents O(N*E) complexity which would slow down large graphs
    const nodeEdgeMap = new Map<string, GraphEdge[]>();
    
    // Initialize map
    nodes.forEach(node => nodeEdgeMap.set(node.id, []));

    // Populate map
    edges.forEach(edge => {
      const sourceList = nodeEdgeMap.get(edge.source);
      const targetList = nodeEdgeMap.get(edge.target);
      if (sourceList) sourceList.push(edge);
      if (targetList) targetList.push(edge);
    });

    const stats: NodeWithStats[] = nodes.map(node => {
      // Get all edges directly connected to this node
      const myEdges = nodeEdgeMap.get(node.id) || [];
      
      const outgoing = myEdges.filter(e => e.source === node.id).length;
      const incoming = myEdges.filter(e => e.target === node.id).length;

      // Calculate Neighbor Connectivity (2nd Degree impact)
      // We find all neighbors, then sum up THEIR total edge counts
      let neighborConnectivity = 0;
      
      const neighborIds = new Set<string>();
      
      myEdges.forEach(edge => {
        const neighborId = edge.source === node.id ? edge.target : edge.source;
        neighborIds.add(neighborId);
      });

      neighborIds.forEach(nId => {
        const neighborEdges = nodeEdgeMap.get(nId);
        if (neighborEdges) {
          neighborConnectivity += neighborEdges.length;
        }
      });
      
      return {
        ...node,
        edgeCount: outgoing + incoming,
        outgoingEdges: outgoing,
        incomingEdges: incoming,
        neighborConnectivity,
      };
    });

    // Sort by total edges (descending)
    return stats.sort((a, b) => b.edgeCount - a.edgeCount);
  }, [nodes, edges]);

  const totalEdges = edges.length;
  const avgEdgesPerNode = nodes.length > 0 ? (totalEdges * 2 / nodes.length).toFixed(1) : '0';

  const handleRowClick = (nodeId: string) => {
    onNodeClick(nodeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
      
      {/* Modal */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-abyss-border bg-abyss">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Graph Statistics</h2>
            <p className="text-sm text-gray-400">
              {nodes.length} nodes • {totalEdges} edges • {avgEdgesPerNode} avg edges/node
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-all duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 bg-abyss border-b border-abyss-border">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Article
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Depth
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Total Edges
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Outgoing
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Incoming
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider" title="Total edges connected to this node's neighbors">
                  Neighbor Conn.
                </th>
                <th className="text-center p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Expansions
                </th>
              </tr>
            </thead>
            <tbody>
              {nodesWithStats.map((node, index) => (
                <tr
                  key={node.id}
                  onClick={() => handleRowClick(node.id)}
                  className="border-b border-abyss-border hover:bg-abyss-hover transition-colors cursor-pointer group"
                >
                  <td className="p-4 text-gray-400 font-mono text-sm">
                    #{index + 1}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getDepthColor(node.depth)}`} />
                      <div className="min-w-0">
                        <div className="text-white font-medium group-hover:text-brand-glow transition-colors truncate">
                          {node.label}
                        </div>
                        {node.data.extract && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {node.data.extract.substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-semibold ${getDepthBadgeColor(node.depth)}`}>
                      {node.depth}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-glow font-bold text-sm border border-brand-primary/20">
                      {node.edgeCount}
                    </span>
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono text-sm">
                    {node.outgoingEdges}
                  </td>
                  <td className="p-4 text-center text-gray-300 font-mono text-sm">
                    {node.incomingEdges}
                  </td>
                  <td className="p-4 text-center text-emerald-400 font-mono text-sm font-medium">
                    {node.neighborConnectivity}
                  </td>
                  <td className="p-4 text-center text-gray-400 font-mono text-sm">
                    {node.expansionCount}×
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-abyss-border bg-abyss flex items-center justify-between text-xs text-gray-500">
          <span>Click any row to focus on that node in the graph</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions for styling
function getDepthColor(depth: number): string {
  const colors = [
    'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]', // Depth 0
    'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]', // Depth 1
    'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.5)]', // Depth 2
    'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]',    // Depth 3
    'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]',    // Depth 4+
  ];
  return colors[Math.min(depth, colors.length - 1)];
}

function getDepthBadgeColor(depth: number): string {
  const colors = [
    'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    'bg-purple-400/20 text-purple-200 border border-purple-400/30',
    'bg-indigo-400/20 text-indigo-200 border border-indigo-400/30',
    'bg-blue-400/20 text-blue-200 border border-blue-400/30',
    'bg-cyan-400/20 text-cyan-200 border border-cyan-400/30',
  ];
  return colors[Math.min(depth, colors.length - 1)];
}