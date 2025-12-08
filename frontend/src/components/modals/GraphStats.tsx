import { 
  XMarkIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  FunnelIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { FunnelIcon as FunnelIconSolid } from '@heroicons/react/24/solid';
import { useMemo, useState, useEffect, useRef } from 'react';
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
  graphConnectivity: number;
  clusteringCoeff: number;
}

type SortKey = 'label' | 'depth' | 'edgeCount' | 'outgoingEdges' | 'incomingEdges' | 'neighborConnectivity' | 'graphConnectivity' | 'expansionCount' | 'clusteringCoeff';
type ColumnType = 'text' | 'number' | 'category';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface FilterState {
  min?: number;
  max?: number;
  search?: string;
  selectedCategories?: number[];
}

const STORAGE_KEY = 'wikiExplorer_stats_config';

export function GraphStatsModal({ nodes, edges, onClose, onNodeClick }: GraphStatsModalProps) {
  
  // --- 1. State Management ---
  const loadInitialState = () => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load session state", e);
    }
    return {
      sortHistory: [{ key: 'edgeCount', direction: 'desc' }] as SortConfig[],
      filters: {} as Record<string, FilterState>
    };
  };

  const [initialState] = useState(loadInitialState);
  const [sortHistory, setSortHistory] = useState<SortConfig[]>(initialState.sortHistory);
  const [filters, setFilters] = useState<Record<string, FilterState>>(initialState.filters);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ sortHistory, filters }));
  }, [sortHistory, filters]);

  // --- 2. Data Processing ---
  const nodesWithStats = useMemo(() => {
    const nodeEdgeMap = new Map<string, GraphEdge[]>();
    nodes.forEach(node => nodeEdgeMap.set(node.id, []));
    const edgeExistenceSet = new Set<string>();

    edges.forEach(edge => {
      nodeEdgeMap.get(edge.source)?.push(edge);
      nodeEdgeMap.get(edge.target)?.push(edge);
      edgeExistenceSet.add(`${edge.source}|${edge.target}`);
    });

    const totalNodes = nodes.length;

    return nodes.map(node => {
      const myEdges = nodeEdgeMap.get(node.id) || [];
      const outgoing = myEdges.filter(e => e.source === node.id).length;
      const incoming = myEdges.filter(e => e.target === node.id).length;
      const totalDegree = outgoing + incoming;

      // Neighbor Connectivity
      const neighborIds = new Set<string>();
      myEdges.forEach(edge => {
        const neighborId = edge.source === node.id ? edge.target : edge.source;
        if (neighborId !== node.id) neighborIds.add(neighborId);
      });

      let neighborConnectivity = 0;
      neighborIds.forEach(nId => {
        const nEdges = nodeEdgeMap.get(nId);
        if (nEdges) neighborConnectivity += nEdges.length;
      });

      // Graph Connectivity %
      const maxPossibleConnections = totalNodes > 1 ? totalNodes - 1 : 1;
      const graphConnectivity = parseFloat(((totalDegree / maxPossibleConnections) * 100).toFixed(2));

      // Clustering Coefficient
      const neighbors = Array.from(neighborIds);
      const k = neighbors.length;
      let actualNeighborConnections = 0;
      let clusteringCoeff = 0;
      const possibleNeighborPairs = (k * (k - 1)) / 2;

      if (possibleNeighborPairs > 0) {
        for (let i = 0; i < k; i++) {
          for (let j = i + 1; j < k; j++) {
            const n1 = neighbors[i];
            const n2 = neighbors[j];
            if (edgeExistenceSet.has(`${n1}|${n2}`) || edgeExistenceSet.has(`${n2}|${n1}`)) {
              actualNeighborConnections++;
            }
          }
        }
        clusteringCoeff = Math.round((actualNeighborConnections / possibleNeighborPairs) * 100);
      }
      
      return {
        ...node,
        edgeCount: totalDegree,
        outgoingEdges: outgoing,
        incomingEdges: incoming,
        neighborConnectivity,
        graphConnectivity,
        clusteringCoeff
      };
    });
  }, [nodes, edges]);

  // --- 3. Filtering & Sorting ---
  const filteredAndSortedNodes = useMemo(() => {
    let result = [...nodesWithStats];

    // Apply Filters
    Object.entries(filters).forEach(([key, filter]) => {
      result = result.filter(node => {
        const val = node[key as keyof NodeWithStats];

        if (typeof val === 'number') {
          if (filter.min !== undefined && val < filter.min) return false;
          if (filter.max !== undefined && val > filter.max) return false;
        }

        if (typeof val === 'string' && filter.search) {
          if (!val.toLowerCase().includes(filter.search.toLowerCase())) return false;
        }

        if (key === 'depth' && filter.selectedCategories) {
          if (!filter.selectedCategories.includes(node.depth)) return false;
        }

        return true;
      });
    });

    // Apply Sort
    [...sortHistory].reverse().forEach(config => {
      result.sort((a, b) => {
        const valA = a[config.key];
        const valB = b[config.key];

        if (typeof valA === 'string' && typeof valB === 'string') {
          return config.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        
        if (valA < valB) return config.direction === 'asc' ? -1 : 1;
        if (valA > valB) return config.direction === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return result;
  }, [nodesWithStats, filters, sortHistory]);

  // --- 4. Export Functions ---

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(filteredAndSortedNodes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph_stats_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    // Create TSV format (Excel friendly)
    const headers = ['Article', 'Depth', 'Edges', 'Outgoing', 'Incoming', 'Neighbor Conn', 'Graph Conn %', 'Cluster %', 'Expansions'];
    const rows = filteredAndSortedNodes.map(n => [
      n.label,
      n.depth,
      n.edgeCount,
      n.outgoingEdges,
      n.incomingEdges,
      n.neighborConnectivity,
      n.graphConnectivity,
      n.clusteringCoeff,
      n.expansionCount
    ].join('\t'));
    
    const textData = [headers.join('\t'), ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(textData);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // --- 5. Handlers ---

  const handleSort = (key: SortKey) => {
    setSortHistory(prev => {
      const existingIndex = prev.findIndex(s => s.key === key);
      let newDirection: 'asc' | 'desc' = 'desc';

      if (existingIndex === 0) {
        newDirection = prev[0].direction === 'asc' ? 'desc' : 'asc';
      } else if (key === 'label') {
        newDirection = 'asc';
      }

      const cleanHistory = prev.filter(s => s.key !== key);
      return [{ key, direction: newDirection }, ...cleanHistory].slice(0, 3);
    });
  };

  const updateFilter = (key: string, updates: Partial<FilterState>) => {
    setFilters(prev => {
      const current = prev[key] || {};
      const updated = { ...current, ...updates };
      
      if (updated.min === undefined && updated.max === undefined && !updated.search && !updated.selectedCategories) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: updated };
    });
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
    setActiveFilterDropdown(null);
  };

  // --- 6. Helper Components ---

  const ColumnHeader = ({ 
    label, id, type, align = 'center', title, minWidth
  }: { 
    label: string, id: SortKey, type: ColumnType, align?: 'left' | 'center' | 'right', title?: string, minWidth?: string
  }) => {
    const sortIndex = sortHistory.findIndex(s => s.key === id);
    const isSorted = sortIndex !== -1;
    const sortConfig = sortHistory[sortIndex];
    const isFiltered = !!filters[id];
    const dropdownOpen = activeFilterDropdown === id;
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClick = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setActiveFilterDropdown(null);
        }
      };
      if (dropdownOpen) document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }, [dropdownOpen]);

    const uniqueValues = useMemo(() => {
      if (type !== 'category') return [];
      return Array.from(new Set(nodesWithStats.map(n => n[id]))).sort((a, b) => (a as number) - (b as number));
    }, []);

    return (
      <th className={`relative p-0 z-${dropdownOpen ? '50' : '10'}`} style={{ minWidth }}>
        <div className={`
          flex items-center gap-2 p-4
          ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}
          text-xs font-semibold uppercase tracking-wider
          group hover:bg-abyss-hover/50 transition-colors
          ${isSorted ? 'text-white' : 'text-gray-400'}
        `}>
          <div 
            className="flex items-center gap-1 cursor-pointer select-text whitespace-nowrap"
            onClick={() => handleSort(id)}
            title={title || `Sort by ${label}`}
          >
            {label}
            {isSorted && (
              <span className="flex items-center text-brand-glow">
                {sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                {sortIndex > 0 && <span className="text-[9px] ml-0.5 opacity-70">{sortIndex + 1}</span>}
              </span>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setActiveFilterDropdown(dropdownOpen ? null : id); }}
            className={`p-1 rounded hover:bg-abyss-highlight transition-colors ${isFiltered ? 'text-brand-primary' : 'text-gray-600 hover:text-gray-300'}`}
          >
            {isFiltered ? <FunnelIconSolid className="w-3.5 h-3.5" /> : <FunnelIcon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {dropdownOpen && (
          <div 
            ref={dropdownRef}
            className="absolute top-full right-0 mt-1 w-56 bg-abyss-surface border border-abyss-border rounded-xl shadow-2xl overflow-hidden z-50 p-3 animate-fade-in cursor-default text-left select-text"
          >
            <div className="text-xs font-semibold text-white mb-2 pb-2 border-b border-abyss-border flex justify-between items-center">
              <span>Filter {label}</span>
              {isFiltered && (
                <button onClick={() => clearFilter(id)} className="text-red-400 hover:text-red-300 flex items-center gap-1">
                  <TrashIcon className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="space-y-3">
              {type === 'number' && (
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Min</label>
                    <input 
                      type="number" 
                      value={filters[id]?.min ?? ''}
                      onChange={e => updateFilter(id, { min: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-abyss border border-abyss-border rounded px-2 py-1 text-white text-sm focus:border-brand-primary/50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase">Max</label>
                    <input 
                      type="number" 
                      value={filters[id]?.max ?? ''}
                      onChange={e => updateFilter(id, { max: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-abyss border border-abyss-border rounded px-2 py-1 text-white text-sm focus:border-brand-primary/50 outline-none"
                    />
                  </div>
                </div>
              )}

              {type === 'text' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase">Contains</label>
                  <input 
                    type="text" 
                    value={filters[id]?.search ?? ''}
                    onChange={e => updateFilter(id, { search: e.target.value })}
                    placeholder="Search..."
                    className="w-full bg-abyss border border-abyss-border rounded px-2 py-1 text-white text-sm focus:border-brand-primary/50 outline-none"
                    autoFocus
                  />
                </div>
              )}

              {type === 'category' && (
                <div className="space-y-2">
                  <div className="flex gap-2 mb-1">
                    <button onClick={() => updateFilter(id, { selectedCategories: uniqueValues as number[] })} className="text-[10px] text-brand-glow hover:underline">Select All</button>
                    <button onClick={() => updateFilter(id, { selectedCategories: [] })} className="text-[10px] text-brand-glow hover:underline">None</button>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1 border border-abyss-border rounded p-1 bg-abyss">
                    {uniqueValues.map(val => {
                      const isSelected = filters[id]?.selectedCategories?.includes(val as number) ?? true;
                      return (
                        <label key={val as number} className="flex items-center gap-2 px-2 py-1 hover:bg-abyss-highlight rounded cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const current = filters[id]?.selectedCategories ?? uniqueValues as number[];
                              let next;
                              if (e.target.checked) next = [...current, val as number];
                              else next = current.filter(v => v !== val);
                              updateFilter(id, { selectedCategories: next });
                            }}
                            className="rounded border-abyss-border bg-abyss-surface text-brand-primary focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="text-sm text-gray-300">{val}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </th>
    );
  };

  const handleRowClick = (nodeId: string) => {
    onNodeClick(nodeId);
    onClose();
  };

  const totalEdges = edges.length;
  const avgEdgesPerNode = nodes.length > 0 ? (totalEdges * 2 / nodes.length).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
      <div className="relative w-auto max-w-[95vw] h-[90vh] bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col select-text">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-abyss-border bg-abyss select-none flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Graph Statistics</h2>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>{filteredAndSortedNodes.length} / {nodes.length} nodes shown</span>
              <span>•</span>
              <span>{totalEdges} total edges</span>
              <span>•</span>
              <span>{avgEdgesPerNode} avg/node</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Action Buttons */}
            <button 
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3 py-1.5 bg-abyss-hover border border-abyss-border hover:border-brand-primary/50 text-gray-300 hover:text-white rounded-lg transition-colors text-sm"
              title="Download table data as JSON"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span className="hidden md:inline">Export JSON</span>
            </button>

            <button 
              onClick={handleCopyToClipboard}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-sm ${
                copyFeedback 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                  : 'bg-abyss-hover border-abyss-border hover:border-brand-primary/50 text-gray-300 hover:text-white'
              }`}
              title="Copy table to clipboard (Excel compatible)"
            >
              {copyFeedback ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              <span className="hidden md:inline">{copyFeedback ? 'Copied!' : 'Copy Table'}</span>
            </button>

            <div className="w-px h-6 bg-abyss-border mx-1" />

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-abyss-hover rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full relative border-collapse">
            <thead className="sticky top-0 bg-abyss border-b border-abyss-border shadow-lg z-20">
              <tr>
                <th className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16 select-none bg-abyss">#</th>
                <ColumnHeader label="Article" id="label" type="text" align="left" minWidth="200px" />
                <ColumnHeader label="Depth" id="depth" type="category" title="Distance from root" />
                <ColumnHeader label="Edges" id="edgeCount" type="number" />
                <ColumnHeader label="Outgoing" id="outgoingEdges" type="number" />
                <ColumnHeader label="Incoming" id="incomingEdges" type="number" />
                <ColumnHeader label="Neighbor Conn" id="neighborConnectivity" type="number" title="Sum of neighbor degrees" minWidth="120px" />
                <ColumnHeader label="Graph Conn %" id="graphConnectivity" type="number" title="% of all graph nodes connected to this node" minWidth="120px" />
                <ColumnHeader label="Cluster %" id="clusteringCoeff" type="number" title="% Actual vs Possible edges between neighbors" />
                <ColumnHeader label="Expansions" id="expansionCount" type="number" />
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedNodes.map((node, index) => (
                <tr
                  key={node.id}
                  onClick={() => handleRowClick(node.id)}
                  className="border-b border-abyss-border hover:bg-abyss-hover transition-colors cursor-pointer group"
                >
                  <td className="p-4 text-gray-500 font-mono text-sm select-none">{index + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getDepthColor(node.depth)}`} />
                      <div className="text-white font-medium group-hover:text-brand-glow transition-colors truncate max-w-[200px]" title={node.label}>
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
                  <td className="p-4 text-center text-gray-300 font-mono text-sm">{node.outgoingEdges}</td>
                  <td className="p-4 text-center text-gray-300 font-mono text-sm">{node.incomingEdges}</td>
                  <td className="p-4 text-center text-emerald-400 font-mono text-sm font-medium">{node.neighborConnectivity}</td>
                  <td className="p-4 text-center font-mono text-sm font-medium">
                    <span className={`${
                      node.graphConnectivity > 10 ? 'text-purple-400' :
                      node.graphConnectivity > 5 ? 'text-brand-glow' : 'text-gray-500'
                    }`}>
                      {node.graphConnectivity}%
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-sm font-medium">
                    <span className={`${
                      node.clusteringCoeff > 50 ? 'text-purple-400' : 
                      node.clusteringCoeff > 25 ? 'text-blue-400' : 'text-gray-500'
                    }`}>
                      {node.clusteringCoeff}%
                    </span>
                  </td>
                  <td className="p-4 text-center text-gray-400 font-mono text-sm">{node.expansionCount}×</td>
                </tr>
              ))}
              {filteredAndSortedNodes.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-500">
                    No nodes match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-abyss-border bg-abyss flex items-center justify-between text-xs text-gray-500 select-none flex-shrink-0">
          <div className="flex gap-4">
            <span>Shift+Click header for multi-sort</span>
            <span>Click funnel icon to filter</span>
          </div>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}

function getDepthColor(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  const saturation = 70 + (depth * 4);
  const lightness = 65 - (depth * 6);
  return `shadow-[0_0_8px_hsl(${hue},${saturation}%,${lightness}%,0.6)] bg-[hsl(${hue},${saturation}%,${lightness}%)]`;
}

function getDepthBadgeColor(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  const saturation = 70 + (depth * 4);
  const lightness = 65 - (depth * 6);
  return `bg-[hsl(${hue},${saturation}%,${lightness}%,0.2)] text-[hsl(${hue},${saturation}%,${lightness + 15}%)] border border-[hsl(${hue},${saturation}%,${lightness}%,0.3)]`;
}