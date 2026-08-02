import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { AssistantState } from '../../types';
import { OrbController } from '../../orb/OrbController';

export interface OrbSceneProps {
  stateRef: MutableRefObject<AssistantState>;
  volumeRef: MutableRefObject<number>;
  width?: number;
  height?: number;
}

/**
 * OrbScene — unified React wrapper that mounts and manages the professional OrbController.
 */
export function OrbScene({ stateRef, volumeRef, width = 540, height = 540 }: OrbSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new OrbController({
      container,
      width,
      height,
      stateRef,
      volumeRef,
    });

    controller.start();

    const handleResize = () => controller.handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controller.dispose();
    };
  }, [width, height, stateRef, volumeRef]);

  return (
    <div
      ref={containerRef}
      className="relative pointer-events-none z-10 flex items-center justify-center"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}
