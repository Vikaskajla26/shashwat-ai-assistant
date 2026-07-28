import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const distDir = path.join(process.cwd(), 'dist-exe');

console.log('[Build EXE] Removing old dist-exe directory...');
try {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
} catch (e) {
  console.warn('[Build EXE] Cleanup notice:', e.message);
}

console.log('[Build EXE] Building Windows NSIS installer...');
try {
  execSync('npx electron-builder --win nsis', { stdio: 'inherit' });
  console.log('[Build EXE] Successfully built Windows installer!');
} catch (err) {
  console.error('[Build EXE] Error building executable:', err.message);
  process.exit(1);
}
