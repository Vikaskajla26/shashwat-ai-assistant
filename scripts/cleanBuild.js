import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const releaseDir = path.join(process.cwd(), 'release');

console.log('[Clean Build] Clearing old release folder...');
try {
  if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true, force: true });
    console.log('[Clean Build] Successfully removed release folder.');
  }
} catch (err) {
  console.warn('[Clean Build] Warning during release folder cleanup:', err.message);
}

console.log('[Clean Build] Starting npm run dist...');
try {
  execSync('npx electron-builder --win nsis portable', { stdio: 'inherit' });
  console.log('[Clean Build] Executable build complete!');
} catch (err) {
  console.error('[Clean Build] Error building executables:', err.message);
  process.exit(1);
}
