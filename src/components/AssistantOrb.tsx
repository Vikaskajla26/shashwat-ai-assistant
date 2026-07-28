import React, { useEffect, useRef } from 'react';
import { AssistantState, AssistantMood } from '../types';

interface AssistantOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume?: number;
  outputVolume?: number;
  volume?: number;
  isMuted?: boolean;
}

const TAU = Math.PI * 2;

function rand(a = 1, b: number | null = null): number {
  if (b === null) {
    b = a;
    a = 0;
  }
  return a + Math.random() * (b - a);
}

// 2D Simplex/Perlin-like noise approximation for organic liquid blob morphing
function noise2D(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 1.6 + t * 0.9) * Math.cos(y * 1.6 + t * 1.0) +
    Math.sin(x * 3.4 - t * 1.3) * 0.5 * Math.cos(y * 3.0 + t * 1.2) +
    Math.sin((x + y) * 2.2 + t * 1.5) * 0.25
  );
}

import { Three3DBlobOrb } from './Three3DBlobOrb';

export const AssistantOrb: React.FC<AssistantOrbProps> = (props) => {
  return <Three3DBlobOrb {...props} />;
};
