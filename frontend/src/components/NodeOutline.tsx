// frontend/src/components/NodeOutline.tsx
import { useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  MagnifyingGlassIcon,
  ScissorsIcon // Note: Heroicons might export this as ScissorsIcon or similar. If not available, we use a different one below.
} from '@heroicons/react/24/outline';
import { useGraphStore } from '../stores/graphStore';

// If ScissorsIcon isn't in your installed version of heroicons, you can use this SVG directly:
function CutIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 12V9.832c0-.287-.055-.57-.16-.832M9 6v3.75m6-3.75v3.75m-6-3.75h6" /> 
      {/* Fallback to simple scissors path if preferred */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" className="hidden"/> 
    </svg>
  );
}

// Simpler Scissors Icon
function PruneIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6" />
        </svg>
    )
}

// Actual Scissors
function Scissors({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 11-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" />
        </svg>
    )
}

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
  const { nodes, edges, rootNode, pruneGraph } = useGraphStore();
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([rootNode || '']));

  // Build hierarchical tree from flat graph structure
  const buildTree = (): TreeNode | null => {
    if (!rootNode) return null;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const assignedParent = new Map<string, string>(); 
    
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode && targetNode.depth === sourceNode.depth + 1) {
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

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    setExpandedNodes(new Set(nodes.map(n => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([rootNode || '']));
  };

  const filterTree = (node: TreeNode, query: string): TreeNode | null => {
    if (!query.trim()) return node;

    const lowerQuery = query.toLowerCase();
    const matchesSelf = node.label.toLowerCase().includes(lowerQuery);
    const filteredChildren = node.children
      .map(child => filterTree(child, query))
      .filter((child): child is TreeNode => child !== null);

    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  const filteredTree = tree && searchFilter ? filterTree(tree, searchFilter) : tree;

  const handlePrune = (nodeId: string, label: string) => {
    if (confirm(`Set "${label}" as the new root? This will remove all parent nodes.`)) {
        pruneGraph(nodeId);
    }
  };

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
          {/* Expand/Collapse Icon */}
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
              isExpanded ? 
                <ChevronDownIcon className="w-3.5 h-3.5" /> : 
                <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Node Label */}
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

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {node.depth === 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  ROOT
                </span>
              )}
              {node.expansionCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 bg-brand-primary/20 text-brand-glow rounded border border-brand-primary/30">
                  {node.expansionCount}×
                </span>
              )}
              {hasChildren && (
                <span className="text-xs text-gray-500">
                  ({node.children.length})
                </span>
              )}
            </div>
          </button>

          {/* NEW: Prune Button (Scissors) */}
          {/* Only show on hover and if NOT the root node */}
          {!isRoot && (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handlePrune(node.id, node.label);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 hover:bg-abyss/50 rounded transition-all ml-auto"
                title="Prune Roots (Set as new Root)"
            >
                <Scissors className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Children */}
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
        {isOpen ? (
          <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      <div
        className={`
          flex flex-col h-full
          lg:fixed lg:left-0 lg:top-0 lg:w-1/5 lg:min-w-[280px] lg:max-w-[400px] 
          bg-transparent lg:bg-abyss-surface/95 lg:backdrop-blur-xl lg:border-r lg:border-abyss-border 
          z-30 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : 'md:-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full md:pt-[88px]">
          <div className="hidden md:block p-4 border-b border-abyss-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">Exploration Path</h2>
              {nodes.length > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={expandAll} className="p-1 text-gray-500 hover:text-white transition-colors rounded" title="Expand all">
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                  <button onClick={collapseAll} className="p-1 text-gray-500 hover:text-white transition-colors rounded" title="Collapse all">
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
            {filteredTree ? (
              <TreeNodeComponent node={filteredTree} />
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchFilter ? 'No matches found' : 'No nodes yet. Start exploring!'}
              </div>
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
    'bg-amber-500',      // Root - Amber
    'bg-purple-500',     // Depth 1 - Purple
    'bg-blue-500',       // Depth 2 - Blue
    'bg-cyan-500',       // Depth 3 - Cyan
    'bg-teal-500',       // Depth 4 - Teal
    'bg-green-500',      // Depth 5 - Green
    'bg-emerald-500',    // Depth 6+ - Emerald
  ];
  
  return colors[Math.min(depth, colors.length - 1)];
}