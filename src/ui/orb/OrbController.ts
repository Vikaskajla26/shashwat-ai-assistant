/**
 * Orb Controller — Bridges React Canvas Ref with OrbScene loop.
 */

import { OrbScene } from './OrbScene';
import { AssistantState } from '../../types';

export class OrbController {
  private scene = new OrbScene();
  private animFrameId = 0;

  public attach(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
    getState: () => AssistantState,
    getAudioLevel: () => number,
    getWakeDetected: () => boolean,
    getThinking: () => boolean,
    getSpeaking: () => boolean
  ): () => void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const loop = () => {
      this.scene.renderScene(
        ctx,
        width,
        height,
        getState(),
        getAudioLevel(),
        getWakeDetected(),
        getThinking(),
        getSpeaking()
      );
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);

    return () => {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
    };
  }
}
