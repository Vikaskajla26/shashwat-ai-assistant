/**
 * Media Subsystem Module for Shashwat AI OS.
 * Manages screen stream capturing, display media source selection, and frame snapshot transmission.
 */

import { BaseModule } from '../BaseModule';
import { ScreenStreamer } from '../../modules/ScreenStreamer';

export class MediaModule extends BaseModule {
  public readonly id = 'media';
  public readonly name = 'Media & Screen Subsystem';
  private screenStreamer: ScreenStreamer | null = null;

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Media Subsystem...');
    this.screenStreamer = new ScreenStreamer();
    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Media Subsystem...');
    this.status = 'RUNNING';
  }

  public async pause(): Promise<void> {
    if (this.screenStreamer) {
      this.screenStreamer.stopStreaming();
    }
    this.status = 'PAUSED';
  }

  public async stop(): Promise<void> {
    this.logger.info(this.id, 'Stopping Media Subsystem...');
    if (this.screenStreamer) {
      try {
        this.screenStreamer.stopStreaming();
      } catch (_) {}
      this.screenStreamer = null;
    }
    this.status = 'UNINITIALIZED';
  }

  public getScreenStreamer(): ScreenStreamer | null {
    return this.screenStreamer;
  }
}
