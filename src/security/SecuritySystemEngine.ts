/**
 * Security & Privacy Engine for Shashwat AI OS (Phase 13 Security & Privacy).
 * Implements AES-256-GCM encryption for API keys and memory,
 * granular permission checking (Desktop, Browser, Screen, Camera, Microphone),
 * Security Audit Logging, Safe Mode, and Emergency Stop.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { CentralLogger } from '../core/CentralLogger';

export type PermissionType = 'desktop' | 'browser' | 'screen' | 'camera' | 'microphone';

export interface AuditLogEntry {
  timestamp: number;
  action: string;
  target: string;
  granted: boolean;
  reason: string;
}

export class SecuritySystemEngine {
  private static instance: SecuritySystemEngine | null = null;
  private logger = CentralLogger.getInstance();

  private isSafeModeActive = false;
  private isEmergencyStopped = false;
  private permissions: Record<PermissionType, boolean> = {
    desktop: true,
    browser: true,
    screen: true,
    camera: true,
    microphone: true,
  };

  private secretKey: Buffer;
  private auditLogPath: string;

  private constructor() {
    // Generate static/derived 256-bit encryption key
    this.secretKey = crypto.scryptSync('shashwat_secret_salt_2026', 'os_salt', 32);

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.auditLogPath = path.join(dataDir, 'security_audit.log');
    this.logAudit('SECURITY_INIT', 'SecuritySystemEngine initialized', true, 'Kernel startup');
  }

  public static getInstance(): SecuritySystemEngine {
    if (!SecuritySystemEngine.instance) {
      SecuritySystemEngine.instance = new SecuritySystemEngine();
    }
    return SecuritySystemEngine.instance;
  }

  /* ------------------- AES-256-GCM Encryption / Decryption ------------------- */

  public encryptData(plainText: string): string {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (_) {
      return plainText;
    }
  }

  public decryptData(cipherText: string): string {
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) return cipherText;
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (_) {
      return cipherText;
    }
  }

  /* ------------------- Permissions & Safe Mode ------------------- */

  public checkPermission(type: PermissionType): boolean {
    if (this.isEmergencyStopped) {
      this.logAudit('PERM_CHECK', type, false, 'Emergency Stop active');
      return false;
    }
    if (this.isSafeModeActive && type === 'desktop') {
      this.logAudit('PERM_CHECK', type, false, 'Safe Mode active');
      return false;
    }

    const granted = this.permissions[type] ?? false;
    this.logAudit('PERM_CHECK', type, granted, granted ? 'Granted' : 'Denied');
    return granted;
  }

  public setPermission(type: PermissionType, granted: boolean): void {
    this.permissions[type] = granted;
    this.logAudit('PERM_UPDATE', type, granted, `Permission set to ${granted}`);
  }

  public toggleSafeMode(active?: boolean): boolean {
    this.isSafeModeActive = active !== undefined ? active : !this.isSafeModeActive;
    this.logAudit('SAFE_MODE', 'System', this.isSafeModeActive, `Safe mode ${this.isSafeModeActive ? 'enabled' : 'disabled'}`);
    return this.isSafeModeActive;
  }

  public isSafeMode(): boolean {
    return this.isSafeModeActive;
  }

  public triggerEmergencyStop(): void {
    this.isEmergencyStopped = true;
    this.logger.error('SecuritySystemEngine', 'EMERGENCY STOP TRIGGERED! Halting all active executions.');
    this.logAudit('EMERGENCY_STOP', 'System', false, 'Emergency Stop invoked by user');
  }

  public resetEmergencyStop(): void {
    this.isEmergencyStopped = false;
    this.logAudit('EMERGENCY_RESET', 'System', true, 'Emergency Stop reset');
  }

  public isStopped(): boolean {
    return this.isEmergencyStopped;
  }

  /* ------------------- Security Audit Logger ------------------- */

  public logAudit(action: string, target: string, granted: boolean, reason: string): void {
    const entry: AuditLogEntry = { timestamp: Date.now(), action, target, granted, reason };
    const line = `[${new Date(entry.timestamp).toISOString()}] [${entry.action}] Target: ${entry.target} | Granted: ${entry.granted} | Reason: ${entry.reason}\n`;
    try {
      fs.appendFileSync(this.auditLogPath, line);
    } catch (_) {}
  }
}
