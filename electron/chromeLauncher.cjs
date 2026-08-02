/**
 * Chrome Launcher helper for Electron Main & Preload scripts.
 * Launches Google Chrome directly if installed, falling back to shell.openExternal / system default.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');

function getChromeExecutablePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

function openInChromeOrSystemDefault(url) {
  let target = (url || '').trim();
  if (!target.startsWith('http://') && !target.startsWith('https://') && !target.startsWith('file://')) {
    target = 'https://' + target;
  }

  const chromePath = getChromeExecutablePath();
  if (chromePath) {
    try {
      spawn(chromePath, [target], { detached: true, stdio: 'ignore' }).unref();
      return true;
    } catch (_) {}
  }

  // Fallback to system default browser via Electron shell
  shell.openExternal(target);
  return false;
}

module.exports = {
  getChromeExecutablePath,
  openInChromeOrSystemDefault,
};
