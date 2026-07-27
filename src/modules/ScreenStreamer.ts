export interface ScreenStreamerOptions {
  onFrame: (base64Jpeg: string) => void;
  onEnded: () => void;
  onError: (error: Error) => void;
  fps?: number; // default 0.7 (every ~1.4 seconds)
  maxWidth?: number; // default 1024
  maxHeight?: number; // default 768
  quality?: number; // default 0.65
}

export class ScreenStreamer {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private intervalId: number | null = null;
  private isStreaming = false;
  private options: ScreenStreamerOptions;

  constructor(options: ScreenStreamerOptions) {
    this.options = options;
  }

  public async start(): Promise<boolean> {
    if (this.isStreaming) return true;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      this.options.onError(new Error('Screen sharing is not supported by this browser.'));
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always',
        } as any,
        audio: false,
      });

      // Handle track stop (e.g. user clicks "Stop sharing" floating bar)
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stop();
          this.options.onEnded();
        };
      }

      // Create video element to draw frames from
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play().catch(() => {});

      // Create offscreen canvas for frame extraction
      this.canvasElement = document.createElement('canvas');

      this.isStreaming = true;

      // Start frame capture loop
      const fps = this.options.fps || 0.7; // ~1 frame every 1.4 seconds
      const intervalMs = Math.round(1000 / fps);

      this.intervalId = window.setInterval(() => {
        this.captureAndSendFrame();
      }, intervalMs);

      // Send initial frame immediately after a short delay for video initialization
      setTimeout(() => {
        this.captureAndSendFrame();
      }, 500);

      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Error starting screen share:', err);
        this.options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      this.stop();
      return false;
    }
  }

  private captureAndSendFrame() {
    if (!this.isStreaming || !this.videoElement || !this.canvasElement) return;
    if (this.videoElement.readyState < 2) return; // Need HAVE_CURRENT_DATA

    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;
    if (!videoWidth || !videoHeight) return;

    const maxW = this.options.maxWidth || 1024;
    const maxH = this.options.maxHeight || 768;

    let width = videoWidth;
    let height = videoHeight;

    if (width > maxW || height > maxH) {
      const aspectRatio = videoWidth / videoHeight;
      if (width / maxW > height / maxH) {
        width = maxW;
        height = Math.round(maxW / aspectRatio);
      } else {
        height = maxH;
        width = Math.round(maxH * aspectRatio);
      }
    }

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(this.videoElement, 0, 0, width, height);

    const quality = this.options.quality || 0.65;
    const dataUrl = this.canvasElement.toDataURL('image/jpeg', quality);

    // Strip "data:image/jpeg;base64," prefix
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    if (base64Data) {
      this.options.onFrame(base64Data);
    }
  }

  public stop(): void {
    this.isStreaming = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.canvasElement = null;
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }
}
