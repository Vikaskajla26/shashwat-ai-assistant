import path from 'path';
import fs from 'fs';

export function getDataDir(): string {
  const baseDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'shashwat-ai-assistant', 'data')
    : path.join(process.cwd(), 'data');

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function getScratchDir(): string {
  const scratchDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'shashwat-ai-assistant', 'scratch')
    : path.join(process.cwd(), 'scratch');

  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  return scratchDir;
}
