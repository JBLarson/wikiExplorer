import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useGraphStore } from '../stores/graphStore';

interface SaveGraphButtonProps {
  disabled?: boolean;
}

export function SaveGraphButton({ disabled = false }: SaveGraphButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [graphName, setGraphName] = useState('');
  const { exportGraphToJSON, nodes, rootNode } = useGraphStore();

  const handleSave = () => {
    if (!graphName.trim()) {
      return;
    }
    
    exportGraphToJSON(graphName);
    setShowModal(false);
    setGraphName('');
  };

  const handleOpenModal = () => {
    // Set default name to root node if available
    const rootNodeData = nodes.find(n => n.id === rootNode);
    const defaultName = rootNodeData?.label || 'My Graph';
    setGraphName(defaultName);
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={disabled}
        className="flex items-center gap-2 px-4 h-10 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border hover:border-brand-primary/50 rounded-xl shadow-glass transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
        title="Save graph to JSON"
      >
        <ArrowDownTrayIcon className="w-5 h-5 text-gray-400 group-hover:text-brand-glow transition-colors" />
        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
          Save
        </span>
      </button>

      {/* Save Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-abyss-surface border border-abyss-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            
            {/* Header */}
            <div className="p-6 border-b border-abyss-border">
              <h2 className="text-xl font-bold text-white">Save Graph</h2>
              <p className="text-sm text-gray-400 mt-1">Export your graph as a JSON file</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="graph-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Graph Name
                </label>
                <input
                  id="graph-name"
                  type="text"
                  value={graphName}
                  onChange={(e) => setGraphName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Enter graph name..."
                  className="w-full px-4 py-2 bg-abyss border border-abyss-border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all"
                  autoFocus
                />
              </div>

              {/* Metadata Preview */}
              <div className="p-4 bg-abyss rounded-xl border border-abyss-border">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Graph Info</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Nodes:</span>
                    <span className="text-white font-mono ml-2">{nodes.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Root:</span>
                    <span className="text-white ml-2 truncate block">{nodes.find(n => n.id === rootNode)?.label || 'None'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-abyss-border flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setGraphName('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!graphName.trim()}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-glow text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Graph
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}