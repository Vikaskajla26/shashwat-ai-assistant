import * as THREE from 'three';
import { StateTheme, getStateTheme } from '../../theme/aiState';
import { AssistantState } from '../../types';

/**
 * StateInterpolator — Continuous Frame-by-Frame AI State Atmosphere Interpolator.
 * Smoothly interpolates colors, speeds, bloom strength, motion intensity, and HUD accents
 * between AI states with zero instant jumps or harsh visual flashes.
 */
export class StateInterpolator {
  private static instance: StateInterpolator | null = null;

  private currentTheme: StateTheme;
  private targetState: AssistantState = 'idle';

  // Smooth lerped Three.js color instances
  private curBaseColor = new THREE.Color('#F59E0B');
  private curAccentColor = new THREE.Color('#F97316');
  private curFresnelColor = new THREE.Color('#FEF08A');
  private curBloomColor = new THREE.Color('#F59E0B');
  private curHudAccent = new THREE.Color('#F59E0B');

  public static getInstance(): StateInterpolator {
    if (!this.instance) {
      this.instance = new StateInterpolator();
    }
    return this.instance;
  }

  constructor() {
    this.currentTheme = { ...getStateTheme('idle') };
  }

  public setTargetState(state: AssistantState): void {
    this.targetState = state;
  }

  public update(dtSeconds: number, lerpFactor = 0.06): StateTheme {
    const targetTheme = getStateTheme(this.targetState);

    // 1. Color Vectors Interpolation
    this.curBaseColor.lerp(new THREE.Color(targetTheme.baseColor), lerpFactor);
    this.curAccentColor.lerp(new THREE.Color(targetTheme.accentColor), lerpFactor);
    this.curFresnelColor.lerp(new THREE.Color(targetTheme.fresnelColor), lerpFactor);
    this.curBloomColor.lerp(new THREE.Color(targetTheme.bloomColor), lerpFactor);
    this.curHudAccent.lerp(new THREE.Color(targetTheme.hudAccent), lerpFactor);

    // 2. Continuous Scalar Parameters Interpolation
    const lerpScalar = (cur: number, target: number) => cur + (target - cur) * lerpFactor;

    this.currentTheme = {
      baseColor: '#' + this.curBaseColor.getHexString(),
      accentColor: '#' + this.curAccentColor.getHexString(),
      fresnelColor: '#' + this.curFresnelColor.getHexString(),
      bloomColor: '#' + this.curBloomColor.getHexString(),
      bloomStrength: lerpScalar(this.currentTheme.bloomStrength, targetTheme.bloomStrength),
      orbSpeed: lerpScalar(this.currentTheme.orbSpeed, targetTheme.orbSpeed),
      orbAmp: lerpScalar(this.currentTheme.orbAmp, targetTheme.orbAmp),
      orbBreath: lerpScalar(this.currentTheme.orbBreath, targetTheme.orbBreath),
      particleSpeed: lerpScalar(this.currentTheme.particleSpeed, targetTheme.particleSpeed),
      particleBrightness: lerpScalar(this.currentTheme.particleBrightness, targetTheme.particleBrightness),
      sutraSpeed: lerpScalar(this.currentTheme.sutraSpeed, targetTheme.sutraSpeed),
      sutraOpacity: lerpScalar(this.currentTheme.sutraOpacity, targetTheme.sutraOpacity),
      hudAccent: '#' + this.curHudAccent.getHexString(),
      hudLabel: targetTheme.hudLabel,
      motionIntensity: lerpScalar(this.currentTheme.motionIntensity, targetTheme.motionIntensity),
    };

    return this.currentTheme;
  }

  public getCurrentTheme(): StateTheme {
    return this.currentTheme;
  }
}
