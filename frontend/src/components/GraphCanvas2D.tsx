// frontend/src/components/GraphCanvas2D.tsx


import { memo } from 'react';
import { SigmaContainer } from '@react-sigma/core';
import { GraphDataController } from './graph2d/GraphDataController';
import { GraphLayoutEngine } from './graph2d/GraphLayoutEngine';
import { GraphInteractionLayer } from './graph2d/GraphInteractionLayer';
import { GraphCameraController } from './graph2d/GraphCameraController';
import { SIGMA_SETTINGS } from './graph2d/GraphSettings';

interface GraphCanvas2DProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphCanvas2D = memo(({ onNodeClick }: GraphCanvas2DProps) => {
  return (
    <div 
      className="w-full h-full bg-abyss relative overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={SIGMA_SETTINGS}
        className="sigma-container"
      >
        <GraphDataController />
        <GraphLayoutEngine />
        <GraphInteractionLayer onNodeClick={onNodeClick} />
        <GraphCameraController />
      </SigmaContainer>
    </div>
  );
});