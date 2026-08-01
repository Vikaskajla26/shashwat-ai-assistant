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

    // 5. Distant Mountain Silhouette Landscape (Reference Image matching)
    ctx.fillStyle = '#02040a';
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.72);
    ctx.bezierCurveTo(this.width * 0.2, this.height * 0.65, this.width * 0.4, this.height * 0.75, this.width * 0.6, this.height * 0.68);
    ctx.bezierCurveTo(this.width * 0.8, this.height * 0.62, this.width * 0.9, this.height * 0.74, this.width, this.height * 0.70);
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    // 6. Starry Glassy Water Surface with Orb Light Ripples
    const waterY = this.height * 0.74;
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, this.height);
    waterGrad.addColorStop(0, 'rgba(8, 12, 30, 0.85)');
    waterGrad.addColorStop(0.5, 'rgba(15, 10, 40, 0.95)');
    waterGrad.addColorStop(1, 'rgba(3, 7, 18, 1.0)');

    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, this.width, this.height - waterY);

    // Glowing Central Reflection Ripple on Water Surface
    const rx = this.width / 2 + offsetX * 0.5;
    const ry = waterY + 40;
    const waterGlow = ctx.createRadialGradient(rx, ry, 0, rx, ry, 280);
    waterGlow.addColorStop(0, 'rgba(168, 85, 247, 0.28)');
    waterGlow.addColorStop(0.4, 'rgba(56, 189, 248, 0.15)');
    waterGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = waterGlow;
    ctx.fillRect(0, waterY, this.width, this.height - waterY);

    // Subtle Water Horizontal Anamorphic Reflection Lines
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const lineY = waterY + 15 + i * 14;
      const rippleOffset = Math.sin(this.time * 1.5 + i * 0.8) * 20;
      ctx.beginPath();
      ctx.moveTo(this.width / 2 - 180 + rippleOffset, lineY);
      ctx.lineTo(this.width / 2 + 180 + rippleOffset, lineY);
      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }
}
