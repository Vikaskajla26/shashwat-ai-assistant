import { useState, useEffect } from 'react';
import { ViewportEngine, ViewportState } from '../engine/rendering/ViewportEngine';

export function useResponsiveLayout(): ViewportState {
  const [state, setState] = useState<ViewportState>(() => ViewportEngine.getInstance().getState());

  useEffect(() => {
    return ViewportEngine.getInstance().subscribe(setState);
  }, []);

  return state;
}
