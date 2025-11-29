// frontend/src/components/GraphComparison.tsx
import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

interface GraphInput {
  article: string;
  expansions: number;
}

interface NodeStats {
  rank: number;
  article: string;
  depth: number;
  total_edges: number;
  outgoing: number;
  incoming: number;
  neighbor_connectivity: number;
  expansions: number;
}

interface GraphResult {
  root_article: string;
  expansions_requested: number;
  total_nodes: number;
  total_edges: number;
  avg_edges_per_node: number;
  max_depth: number;
  nodes: NodeStats[];
}

type SortField = 'rank' | 'article' | 'depth' | 'total_edges' | 'outgoing' | 'incoming' | 'neighbor_connectivity' | 'expansions';
type SortOrder = 'asc' | 'desc';

export function GraphComparison() {
  const [inputs, setInputs] = useState<GraphInput[]>([
    { article: '', expansions: 1 }
  ]);
  const [results, setResults] = useState<GraphResult[]>([]);
  const [selectedGraph, setSelectedGraph] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<SortField>('total_edges');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const addInput = () => {
    if (inputs.length < 12) {
      setInputs([...inputs, { article: '', expansions: 1 }]);
    }
  };

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const updateInput = (index: number, field: keyof GraphInput, value: string | number) => {
    const updated = [...inputs];
    updated[index] = { ...updated[index], [field]: value };
    setInputs(updated);
  };

  const handleCompare = async () => {
    const validInputs = inputs.filter(i => i.article.trim());
    if (validInputs.length === 0) return;

    setLoading(true);
    try {
        const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphs: validInputs }),
      });
      const data = await response.json();
      setResults(data.graphs || []);
      setSelectedGraph(0);
    } catch (error) {
      console.error('Comparison failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedNodes = results[selectedGraph]?.nodes.slice().sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return sortOrder === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  }) || [];

  return (
    <div className="min-h-screen bg-abyss p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-abyss-surface border border-abyss-border rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">Graph Comparison</h1>
          <p className="text-gray-400">Compare statistics across multiple Wikipedia explorations</p>
        </div>

        {/* Input Panel */}
        <div className="bg-abyss-surface border border-abyss-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Topics</h2>
            <button
              onClick={addInput}
              disabled={inputs.length >= 12}
              className="px-3 py-1.5 bg-brand-primary hover:bg-brand-glow text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Topic ({inputs.length}/12)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {inputs.map((input, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-abyss p-3 rounded-xl border border-abyss-border">
                <div className="flex-1">
                  <input
                    type="text"
                    value={input.article}
                    onChange={(e) => updateInput(idx, 'article', e.target.value)}
                    placeholder="Article name..."
                    className="w-full px-3 py-2 bg-abyss-surface border border-abyss-border rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary text-sm"
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={input.expansions}
                    onChange={(e) => updateInput(idx, 'expansions', parseInt(e.target.value) || 1)}
                    min="1"
                    max="5"
                    className="w-full px-2 py-2 bg-abyss-surface border border-abyss-border rounded-lg text-white text-sm text-center focus:outline-none focus:border-brand-primary"
                  />
                  <span className="text-xs text-gray-500 block text-center mt-0.5">exp.</span>
                </div>
                {inputs.length > 1 && (
                  <button
                    onClick={() => removeInput(idx)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleCompare}
            disabled={loading || inputs.filter(i => i.article.trim()).length === 0}
            className="w-full mt-4 px-6 py-3 bg-brand-primary hover:bg-brand-glow text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-5 h-5" />
                Compare Graphs
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <>
            {/* Graph Selector */}
            <div className="bg-abyss-surface border border-abyss-border rounded-2xl p-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {results.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedGraph(idx)}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium
                      ${selectedGraph === idx
                        ? 'bg-brand-primary text-white'
                        : 'bg-abyss text-gray-400 hover:bg-abyss-hover hover:text-white'
                      }
                    `}
                  >
                    <div className="text-left">
                      <div className="font-semibold">{result.root_article}</div>
                      <div className="text-xs opacity-70">
                        {result.total_nodes}N • {result.total_edges}E • {result.avg_edges_per_node} avg
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-abyss-surface border border-abyss-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-abyss-border flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{results[selectedGraph].root_article}</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {results[selectedGraph].total_nodes} nodes • {results[selectedGraph].total_edges} edges • {results[selectedGraph].avg_edges_per_node} avg edges/node • Depth {results[selectedGraph].max_depth}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-abyss border-b border-abyss-border">
                    <tr>
                      {[
                        { field: 'rank' as SortField, label: 'Rank' },
                        { field: 'article' as SortField, label: 'Article' },
                        { field: 'depth' as SortField, label: 'Depth' },
                        { field: 'total_edges' as SortField, label: 'Total Edges' },
                        { field: 'outgoing' as SortField, label: 'Outgoing' },
                        { field: 'incoming' as SortField, label: 'Incoming' },
                        { field: 'neighbor_connectivity' as SortField, label: 'Neighbor Conn.' },
                        { field: 'expansions' as SortField, label: 'Expansions' },
                      ].map(({ field, label }) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          className="text-left p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {label}
                            <ArrowsUpDownIcon className={`
                              w-3 h-3 transition-all
                              ${sortField === field ? 'text-brand-glow' : 'opacity-0 group-hover:opacity-50'}
                            `} />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNodes.map((node, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-abyss-border hover:bg-abyss-hover transition-colors"
                      >
                        <td className="p-4 text-gray-400 font-mono text-sm">
                          #{node.rank}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getDepthIndicator(node.depth)}`} />
                            <span className="text-white font-medium">{node.article}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-mono text-sm font-semibold ${getDepthBadge(node.depth)}`}>
                            {node.depth}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-glow font-bold text-sm border border-brand-primary/20">
                            {node.total_edges}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-300 font-mono text-sm">
                          {node.outgoing}
                        </td>
                        <td className="p-4 text-center text-gray-300 font-mono text-sm">
                          {node.incoming}
                        </td>
                        <td className="p-4 text-center text-emerald-400 font-mono text-sm font-medium">
                          {node.neighbor_connectivity}
                        </td>
                        <td className="p-4 text-center text-gray-400 font-mono text-sm">
                          {node.expansions}×
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getDepthIndicator(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  return `shadow-[0_0_8px_hsl(${hue},70%,65%,0.8)] bg-[hsl(${hue},70%,65%)]`;
}

function getDepthBadge(depth: number): string {
  const hue = 280 - (Math.min(depth, 6) * 27);
  return `bg-[hsl(${hue},70%,65%,0.2)] text-[hsl(${hue},70%,80%)] border border-[hsl(${hue},70%,65%,0.3)]`;
}