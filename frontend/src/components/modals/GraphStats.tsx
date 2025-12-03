// frontend/src/components/modals/GraphStats.tsx
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
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
  neighborConnectivity: number;
  clusteringCoeff: number; // New field for the % calculation
}

// Keys we allow sorting by
type SortKey = 'label' | 'depth' | 'edgeCount' | 'outgoingEdges' | 'incomingEdges' | 'neighborConnectivity' | 'expansionCount' | 'clusteringCoeff';

export function GraphStatsModal({ nodes, edges, onClose, onNodeClick }: GraphStatsModalProps) {
  // 1. Add state for sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'edgeCount',
    direction: 'desc', // Default to highest connectivity
  });

  const nodesWithStats = useMemo(() => {
    // --- 1. Create fast lookups ---
    const nodeEdgeMap = new Map<string, GraphEdge[]>();
    nodes.forEach(node => nodeEdgeMap.set(node.id, []));

    // Fast lookup for edge existence: "source|target"
    const edgeExistenceSet = new Set<string>();

    edges.forEach(edge => {
      // Map for degree counting
      const sourceList = nodeEdgeMap.get(edge.source);
      const targetList = nodeEdgeMap.get(edge.target);
      if (sourceList) sourceList.push(edge);
      if (targetList) targetList.push(edge);

      // Set for connectivity checking
      edgeExistenceSet.add(`${edge.source}|${edge.target}`);
    });

    // --- 2. Calculate Stats ---
    const stats: NodeWithStats[] = nodes.map(node => {
      const myEdges = nodeEdgeMap.get(node.id) || [];
      const outgoing = myEdges.filter(e => e.source === node.id).length;
      const incoming = myEdges.filter(e => e.target === node.id).length;

      // Identify unique neighbors
      const neighborIds = new Set<string>();
      
      myEdges.forEach(edge => {
        const neighborId = edge.source === node.id ? edge.target : edge.source;
        // Exclude self-loops from neighbor set for clustering calc
        if (neighborId !== node.id) {
          neighborIds.add(neighborId);
        }
      });

      // A. Neighbor Connectivity (Sum of neighbors' degrees)
      let neighborConnectivity = 0;
      neighborIds.forEach(nId => {
        const neighborEdges = nodeEdgeMap.get(nId);
        if (neighborEdges) {
          neighborConnectivity += neighborEdges.length;
        }
      });

      // B. Clustering Coefficient (% Actual Edges / Possible Edges between neighbors)
      const neighbors = Array.from(neighborIds);
      const k = neighbors.length;
      let actualNeighborConnections = 0;
      let clusteringCoeff = 0;

      // Max possible edges in an undirected subgraph of k nodes is k * (k - 1) / 2
      const maxPossibleConnections = (k * (k - 1)) / 2;

      if (maxPossibleConnections > 0) {
        // Check every unique pair of neighbors
        for (let i = 0; i < k; i++) {
          for (let j = i + 1; j < k; j++) {
            const n1 = neighbors[i];
            const n2 = neighbors[j];
            
            // Check if connection exists (either direction)
            if (edgeExistenceSet.has(`${n1}|${n2}`) || edgeExistenceSet.has(`${n2}|${n1}`)) {
              actualNeighborConnections++;
            }
          }
        }
        clusteringCoeff = Math.round((actualNeighborConnections / maxPossibleConnections) * 100);
      }
      
      return {
        ...node,
        edgeCount: outgoing + incoming,
        outgoingEdges: outgoing,
        incomingEdges: incoming,
        neighborConnectivity,
        clusteringCoeff
      };
    });

    // --- 3. Sort ---
    return stats.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle string comparison for 'label'
      if (sortConfig.key === 'label') {
        return sortConfig.direction === 'asc' 
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      }

      // Handle number comparison
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [nodes, edges, sortConfig]);

  const totalEdges = edges.length;
  const avgEdgesPerNode = nodes.length > 0 ? (totalEdges * 2 / nodes.length).toFixed(1) : '0';

  const handleRowClick = (nodeId: string) => {
    onNodeClick(nodeId);
    onClose();
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    // If clicking the same column, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key !== key && key === 'label') {
      // Default to ascending for text
      direction = 'asc';
    }

    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey, align = 'left', title }: { label: string, sortKey: SortKey, align?: string, title?: string }) => (
    <th 
      className={`p-4 text-${align} text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group select-none`}
      onClick={() => requestSort(sortKey)}
      title={title}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        <span className="w-3 h-3 flex items-center">
          {sortConfig.key === sortKey ? (
            sortConfig.direction === 'asc' ? <ChevronUpIcon /> : <ChevronDownIcon />
          ) : (
            // Ghost icon that appears on hover
            <ChevronDownIcon className="opacity-0 group-hover:opacity-30" />
          )}
        </span>
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
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
            <thead className="sticky top-0 bg-abyss border-b border-abyss-border z-10">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <SortableHeader label="Article" sortKey="label" align="left" />
                <SortableHeader label="Depth" sortKey="depth" align="center" />
                <SortableHeader label="Total Edges" sortKey="edgeCount" align="center" />
                <SortableHeader label="Outgoing" sortKey="outgoingEdges" align="center" />
                <SortableHeader label="Incoming" sortKey="incomingEdges" align="center" />
                <SortableHeader label="Neighbor Conn." sortKey="neighborConnectivity" align="center" title="Sum of neighbor degrees" />
                <SortableHeader label="Cluster %" sortKey="clusteringCoeff" align="center" title="% Actual Edges / Possible Edges between neighbors" />
                <SortableHeader label="Expansions" sortKey="expansionCount" align="center" />
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
                    {index + 1}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getDepthColor(node.depth)}`} />
                      <div className="text-white font-medium group-hover:text-brand-glow transition-colors">
                        {node.label}
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
                  <td className="p-4 text-center font-mono text-sm font-medium">
                    {/* Color code based on density */}
                    <span className={`${
                      node.clusteringCoeff > 50 ? 'text-purple-400' : 
                      node.clusteringCoeff > 25 ? 'text-blue-400' : 'text-gray-500'
                    }`}>
                      {node.clusteringCoeff}%
                    </span>
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
          <span>Click column headers to sort • Click rows to focus node</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}

// ... existing helper functions (getDepthColor, getDepthBadgeColor) ...
function getDepthColor(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  const saturation = 70 + (depth * 4);
  const lightness = 65 - (depth * 6);
  return `shadow-[0_0_8px_hsl(${hue},${saturation}%,${lightness}%,0.6)]`;
}

function getDepthBadgeColor(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  const saturation = 70 + (depth * 4);
  const lightness = 65 - (depth * 6);
  return `bg-[hsl(${hue},${saturation}%,${lightness}%,0.2)] text-[hsl(${hue},${saturation}%,${lightness + 15}%)] border border-[hsl(${hue},${saturation}%,${lightness}%,0.3)]`;
}