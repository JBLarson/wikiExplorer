// frontend/src/components/NodeOutline.tsx
import { useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  MagnifyingGlassIcon,
  ScissorsIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { useGraphStore } from '../stores/graphStore';

interface NodeOutlineProps {
  isOpen: boolean;
  onToggle: () => void;
  onNodeClick: (nodeId: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  depth: number;
  expansionCount: number;
  children: TreeNode[];
  isExpanded: boolean;
}

export function NodeOutline({ isOpen, onToggle, onNodeClick }: NodeOutlineProps) {
  const { nodes, edges, rootNode, pruneSubtree, setNewRoot } = useGraphStore();
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode || '']));

  // --- Tree Building Logic ---
  const buildTree = (): TreeNode | null => {
    if (!rootNode) return null;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const assignedParent = new Map<string, string>(); 
    
    // Determine parent-child relationships based on depth +1
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode && targetNode.depth === sourceNode.depth + 1) {
        // Only assign parent if not already assigned (tree structure approximation)
        if (!assignedParent.has(edge.target)) {
          assignedParent.set(edge.target, edge.source);
        }
      }
    });

    const childrenMap = new Map<string, string[]>();
    assignedParent.forEach((parentId, childId) => {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(childId);
    });

    const buildNode = (nodeId: string): TreeNode => {
      const node = nodeMap.get(nodeId)!;
      const childIds = childrenMap.get(nodeId) || [];
      
      return {
        id: node.id,
        label: node.label,
        depth: node.depth,
        expansionCount: node.expansionCount,
        isExpanded: expandedNodes.has(nodeId),
        children: childIds.map(buildNode).sort((a, b) => {
          // Sort expanded nodes first
          if (a.expansionCount !== b.expansionCount) {
            return b.expansionCount - a.expansionCount;
          }
          return a.label.localeCompare(b.label);
        }),
      };
    };

    return buildNode(rootNode);
  };

  const tree = buildTree();

  // --- Handlers ---

  const handlePrune = (nodeId: string, label: string) => {
    if (confirm(`Delete "${label}" and its disconnected children?`)) {
        pruneSubtree(nodeId);
    }
  };

  const handleSetRoot = (nodeId: string, label: string) => {
    if (confirm(`Make "${label}" the new Root? This will remove all parent nodes above it.`)) {
        setNewRoot(nodeId);
    }
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
    else newExpanded.add(nodeId);
    setExpandedNodes(newExpanded);
  };

  const filterTree = (node: TreeNode, query: string): TreeNode | null => {
    if (!query.trim()) return node;
    const lowerQuery = query.toLowerCase();
    const matchesSelf = node.label.toLowerCase().includes(lowerQuery);
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter((child): child is TreeNode => child !== null);

    if (matchesSelf || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  };

  const filteredTree = tree && searchFilter ? filterTree(tree, searchFilter) : tree;

  // --- Component ---

  const TreeNodeComponent = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isRoot = node.id === rootNode;

    return (
      <div className="select-none">
        <div 
          className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-abyss-hover transition-colors group cursor-pointer"
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(node.id);
            }}
            className={`flex-shrink-0 w-4 h-4 flex items-center justify-center ${
              hasChildren ? 'text-gray-500 hover:text-white' : 'invisible'
            }`}
          >
            {hasChildren && (
              isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Label Click */}
          <button
            onClick={() => onNodeClick(node.id)}
            className="flex-1 flex items-center gap-2 text-left min-w-0"
          >
            <div 
              className={`flex-shrink-0 w-2 h-2 rounded-full ${getDepthColor(node.depth)}`}
              title={`Depth ${node.depth}`}
            />
            <span className="text-sm text-gray-200 group-hover:text-white transition-colors break-words">
              {node.label}
            </span>
            {node.depth === 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">ROOT</span>
            )}
          </button>

          {/* ACTION BUTTONS (Only show on hover + Not Root) */}
          {!isRoot && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                {/* SET ROOT: Matches your "Delete parents" requirement */}
                <button
                    onClick={(e) => { e.stopPropagation(); handleSetRoot(node.id, node.label); }}
                    className="p-1 text-gray-500 hover:text-brand-glow hover:bg-brand-primary/10 rounded transition-all"
                    title="Make New Root (Removes Parents)"
                >
                    <MapPinIcon className="w-4 h-4" />
                </button>

                {/* PRUNE: Matches "Delete subgraph I don't want" */}
                <button
                    onClick={(e) => { e.stopPropagation(); handlePrune(node.id, node.label); }}
                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                    title="Delete Branch"
                >
                    <ScissorsIcon className="w-4 h-4" />
                </button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-abyss-border ml-3" style={{ marginLeft: `${level * 16 + 16}px` }}>
            {node.children.map(child => (
              <TreeNodeComponent key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={onToggle}
        className={`hidden lg:block fixed top-1/2 -translate-y-1/2 z-50 p-2 bg-abyss-surface/90 backdrop-blur-xl border border-abyss-border rounded-r-xl shadow-glass transition-all duration-300 hover:bg-abyss-hover ${
          isOpen ? 'left-[20%]' : 'left-0'
        }`}
      >
        {isOpen ? <ChevronLeftIcon className="w-5 h-5 text-gray-400" /> : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
      </button>

      <div className={`
          flex flex-col h-full
          lg:fixed lg:left-0 lg:top-0 lg:w-1/5 lg:min-w-[280px] lg:max-w-[400px] 
          bg-transparent lg:bg-abyss-surface/95 lg:backdrop-blur-xl lg:border-r lg:border-abyss-border 
          z-30 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'md:-translate-x-full'}
      `}>
        <div className="flex flex-col h-full md:pt-[88px]">
          <div className="hidden md:block p-4 border-b border-abyss-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Exploration Path</h2>
              {nodes.length > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpandedNodes(new Set(nodes.map(n => n.id)))} className="p-1 text-gray-500 hover:text-white transition-colors rounded">
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpandedNodes(new Set([rootNode || '']))} className="p-1 text-gray-500 hover:text-white transition-colors rounded">
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-abyss-border flex-shrink-0">
             <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter nodes..."
                className="w-full pl-9 pr-3 py-2 bg-abyss border border-abyss-border rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-brand-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar p-2">
            {filteredTree ? <TreeNodeComponent node={filteredTree} /> : (
              <div className="text-center py-8 text-gray-500 text-sm">No matches found</div>
            )}
          </div>

          <div className="p-4 border-t border-abyss-border flex-shrink-0">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-abyss/50 md:bg-abyss rounded-lg p-2 border border-abyss-border/50 md:border-none">
                <div className="text-gray-500">Nodes</div>
                <div className="text-white font-bold text-lg">{nodes.length}</div>
              </div>
              <div className="bg-abyss/50 md:bg-abyss rounded-lg p-2 border border-abyss-border/50 md:border-none">
                <div className="text-gray-500">Depth</div>
                <div className="text-white font-bold text-lg">
                  {nodes.length > 0 ? Math.max(...nodes.map(n => n.depth)) : 0}
                </div>
              </div>
              <div className="bg-abyss/50 md:bg-abyss rounded-lg p-2 border border-abyss-border/50 md:border-none">
                <div className="text-gray-500">Expanded</div>
                <div className="text-white font-bold text-lg">
                  {nodes.filter(n => n.expansionCount > 0).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getDepthColor(depth: number): string {
  const colors = [
    'bg-amber-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-green-500', 'bg-emerald-500'
  ];
  return colors[Math.min(depth, colors.length - 1)];
}