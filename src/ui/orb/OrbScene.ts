/**
 * Orb Scene Manager — Orchestrates procedural render loop at up to 120 FPS.
 */

import { OrbStateConfig, getOrbStateConfig } from './OrbStates';
import { OrbAudioProcessor } from './OrbAudio';
import { MaheshwarRingRenderer } from './MaheshwarRing';
import { OrbParticleSystem } from './OrbParticles';
import { OrbShaderEngine } from './OrbShaders';
import { AssistantState } from '../../types';

export class OrbScene {
  private audioProcessor = new OrbAudioProcessor();
  private ringRenderer = new MaheshwarRingRenderer();
  private particleSystem = new OrbParticleSystem();
  private shaderEngine = new OrbShaderEngine();

  private animFrameId = 0;
  private time = 0;

  public renderScene(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    state: AssistantState,
    rawAudioLevel: number,
    wakeDetected?: boolean,
    isThinking?: boolean,
    isSpeaking?: boolean
  ): void {
    this.time += 0.016;

    let activeState = state;
    if (wakeDetected) activeState = 'wakeWord' as any;
    else if (isThinking) activeState = 'thinking' as any;
    else if (isSpeaking) activeState = 'speaking' as any;

    const config: OrbStateConfig = getOrbStateConfig(activeState);
    const audioLevel = this.audioProcessor.processAudioLevel(rawAudioLevel);

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = width * 0.28;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Outer Glow
    const glowRadius = baseRadius * (1.2 + Math.sin(this.time * config.breathSpeed * 1.5) * 0.08 + audioLevel * 0.35 + config.pulseIntensity * 0.15);
    this.shaderEngine.drawOuterGlow(ctx, centerX, centerY, glowRadius, config);

    // 2. Draw Plasma Core
    const currentRadius = baseRadius * (1.0 + Math.sin(this.time * config.breathSpeed * 2) * 0.05 + audioLevel * 0.22);
    const isThinkingState = String(activeState).toLowerCase() === 'thinking';
    this.shaderEngine.drawPlasmaCore(ctx, centerX, centerY, currentRadius, this.time, config, audioLevel, isThinkingState);

    // 3. Draw Maheshwar Ring
    const orbitRadius = currentRadius * 1.35 + audioLevel * 22;
    this.ringRenderer.draw(ctx, centerX, centerY, orbitRadius, this.time, config, audioLevel);

    // 4. Draw Particles Ecosystem
    const isLearningState = String(activeState).toLowerCase() === 'learning';
    this.particleSystem.updateAndDraw(ctx, centerX, centerY, currentRadius, this.time, config, audioLevel, isLearningState);

    // 5. Draw Fresnel Rim
    this.shaderEngine.drawFresnelRim(ctx, centerX, centerY, currentRadius, config);
  }
}
