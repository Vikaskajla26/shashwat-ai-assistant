import { QualityProfile } from './AdaptiveQualityEngine';

export interface StarParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

export interface FogLayer {
  x: number;
  y: number;
  radius: number;
  driftAngle: number;
  driftSpeed: number;
  color: string;
  alpha: number;
}

/**
 * BackgroundEngine — Procedural WebGL/2D Canvas Rendering Engine for Deep Space
 * Japanese Minimalist atmosphere with imperceptible motion, volumetric fog,
 * procedural stars, floating dust, and adaptive GPU scaling.
 */
export class BackgroundEngine {
  private static instance: BackgroundEngine | null = null;

  private stars: StarParticle[] = [];
  private fogLayers: FogLayer[] = [];
  private dustMotes: StarParticle[] = [];

  private cameraDriftX = 0;
  private cameraDriftY = 0;
  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  private width = 1920;
  private height = 1080;
  private time = 0;

  public static getInstance(): BackgroundEngine {
    if (!this.instance) {
      this.instance = new BackgroundEngine();
    }
    return this.instance;
  }

  public init(width: number, height: number, profile: QualityProfile): void {
    this.width = width;
    this.height = height;
    this.rebuildEnvironment(profile);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setMouseTarget(x: number, y: number): void {
    this.targetMouseX = x;
    this.targetMouseY = y;
  }

  public rebuildEnvironment(profile: QualityProfile): void {
    // Determine particle & star counts based on adaptive GPU profile
    const starCount = Math.round(800 * profile.particleMultiplier);
    const dustCount = Math.round(120 * profile.particleMultiplier);
    const fogCount = profile.enablePostprocessing ? 4 : 2;

    const starColors = [
      '#ffffff', // Pure white
      '#e2e8f0', // Cool slate
      '#93c5fd', // Soft icy blue
      '#c084fc', // Mystical violet
      '#fde047', // Warm amber star
    ];

    // 1. Procedural Stars
    this.stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * this.width * 1.5,
      y: (Math.random() - 0.5) * this.height * 1.5,
      z: Math.random() * 3.0 + 0.2, // Depth factor
      size: Math.random() * 1.6 + 0.4,
      baseAlpha: Math.random() * 0.7 + 0.15,
      twinkleSpeed: Math.random() * 0.015 + 0.003,
      twinklePhase: Math.random() * Math.PI * 2,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    // 2. Floating Dust Motes (foreground/midground)
    this.dustMotes = Array.from({ length: dustCount }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      z: Math.random() * 1.2 + 0.8,
      size: Math.random() * 2.4 + 0.8,
      baseAlpha: Math.random() * 0.4 + 0.1,
      twinkleSpeed: Math.random() * 0.01 + 0.002,
      twinklePhase: Math.random() * Math.PI * 2,
      color: '#a78bfa',
    }));

    // 3. Volumetric Fog Blobs
    const fogColors = ['rgba(139, 92, 246, 0.07)', 'rgba(6, 182, 212, 0.05)', 'rgba(245, 158, 11, 0.04)', 'rgba(16, 185, 129, 0.04)'];
    this.fogLayers = Array.from({ length: fogCount }, (_, i) => ({
      x: (Math.random() - 0.5) * this.width * 0.8,
      y: (Math.random() - 0.5) * this.height * 0.8,
      radius: Math.min(this.width, this.height) * (0.4 + Math.random() * 0.3),
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: (Math.random() * 0.08 + 0.02) * 0.001,
      color: fogColors[i % fogColors.length],
      alpha: 0.06 + Math.random() * 0.04,
    }));
  }

  public render(ctx: CanvasRenderingContext2D, dtSeconds: number, hudAccentColor = '#8b5cf6'): void {
    this.time += dtSeconds;

    // Ultra-slow Lissajous camera drift (imperceptible movement)
    this.cameraDriftX = Math.sin(this.time * 0.03) * 12;
    this.cameraDriftY = Math.cos(this.time * 0.02) * 8;

    // Smooth mouse parallax lerp
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.02;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.02;

    const offsetX = (this.mouseX - this.width / 2) * 0.02 + this.cameraDriftX;
    const offsetY = (this.mouseY - this.height / 2) * 0.02 + this.cameraDriftY;

    // Clear frame
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Deep Space Japanese Minimalist Background Base
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Procedural Volumetric Fog Layers
    this.fogLayers.forEach((fog, i) => {
      fog.driftAngle += fog.driftSpeed;
      const fx = this.width / 2 + fog.x + Math.cos(fog.driftAngle + i) * 30 + offsetX * 0.4;
      const fy = this.height / 2 + fog.y + Math.sin(fog.driftAngle * 0.7 + i) * 20 + offsetY * 0.4;

      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fog.radius);
      grad.addColorStop(0, fog.color);
      grad.addColorStop(1, 'rgba(3, 7, 18, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    });

    // 3. Deep Star Field (Far Depth Layer)
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed;
      const twinkle = Math.sin(star.twinklePhase) * 0.25 + 0.75;
      const px = this.width / 2 + star.x - offsetX * (0.2 / star.z);
      const py = this.height / 2 + star.y - offsetY * (0.2 / star.z);

      if (px < 0 || px > this.width || py < 0 || py > this.height) continue;

      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.baseAlpha * twinkle;
      ctx.beginPath();
      ctx.arc(px, py, star.size / star.z, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Floating Ambient Dust Motes (Near Depth Layer)
    ctx.globalAlpha = 1.0;
    for (const dust of this.dustMotes) {
      dust.x += Math.sin(this.time * 0.2 + dust.twinklePhase) * 0.15;
      dust.y -= 0.1 / dust.z; // Slow upward drift

      if (dust.y < -10) dust.y = this.height + 10;
      if (dust.x < -10) dust.x = this.width + 10;
      if (dust.x > this.width + 10) dust.x = -10;

      dust.twinklePhase += dust.twinkleSpeed;
      const alpha = Math.sin(dust.twinklePhase) * 0.2 + dust.baseAlpha;
      const px = dust.x - offsetX * (0.8 / dust.z);
      const py = dust.y - offsetY * (0.8 / dust.z);

      ctx.fillStyle = hudAccentColor;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(px, py, dust.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
  }
}
