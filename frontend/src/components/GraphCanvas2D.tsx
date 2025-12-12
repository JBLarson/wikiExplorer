// frontend/src/components/GraphCanvas2D.tsx
import { memo } from 'react';
import { SigmaContainer } from '@react-sigma/core';
import { GraphDataController } from './graph2d/GraphDataController';
import { GraphLayoutEngine } from './graph2d/GraphLayoutEngine';
import { GraphInteractionLayer } from './graph2d/GraphInteractionLayer';
import { SIGMA_SETTINGS } from './graph2d/GraphSettings';

// FIXED: Removed the broken import "@react-sigma/core/lib/react-sigma.min.css";
// We handle layout in index.css now.

interface GraphCanvas2DProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphCanvas2D = memo(({ onNodeClick }: GraphCanvas2DProps) => {
  return (
    <div 
      className="w-full h-full bg-abyss relative overflow-hidden"
      style={{ isolation: 'isolate' }} // Creates a new stacking context
    >
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={SIGMA_SETTINGS}
        className="sigma-container" // Hook for CSS
      >
        {/* 1. Data Layer: Syncs Store -> Graphology */}
        <GraphDataController />
        
        {/* 2. Physics Layer: Handles ForceAtlas2 */}
        <GraphLayoutEngine />
        
        {/* 3. Interaction Layer: Handles Clicks/Hovers */}
        <GraphInteractionLayer onNodeClick={onNodeClick} />
        
      </SigmaContainer>
    </div>
  );
});