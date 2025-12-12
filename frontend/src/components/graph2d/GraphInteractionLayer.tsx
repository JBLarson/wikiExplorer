//frontend/src/components/graph2d/GraphInteractionLayer.tsx


import { useEffect } from 'react';
import { useRegisterEvents, useSigma } from '@react-sigma/core';

interface InteractionProps {
  onNodeClick: (nodeId: string) => void;
}

export const GraphInteractionLayer = ({ onNodeClick }: InteractionProps) => {
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    registerEvents({
      // Node Click: Propagate ID back to parent
      clickNode: (event) => {
        // Prevent click from hitting the stage (canvas background)
        if (event.event && event.event.original) {
          event.event.original.stopPropagation();
        }
        onNodeClick(event.node);
      },

      // Hover Effects: Change cursor
      enterNode: () => {
        const container = sigma.getContainer();
        if (container) container.style.cursor = 'pointer';
      },
      
      leaveNode: () => {
        const container = sigma.getContainer();
        if (container) container.style.cursor = 'default';
      },

      // Background Click: Optional - could be used to deselect
      clickStage: () => {
        // Future: Deselect node
      }
    });
  }, [registerEvents, onNodeClick, sigma]);

  return null;
};