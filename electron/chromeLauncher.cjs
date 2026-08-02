/**
 * Chrome Launcher helper for Electron Main & Preload scripts.
 * Launches Google Chrome directly if installed, falling back to shell.openExternal / system default.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');

function getChromeExecutablePath() {
  // 1. Check Windows Registry App Paths
  try {
    if (os.platform() === 'win32') {
      const regCmds = [
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
        'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve',
      ];
      for (const cmdStr of regCmds) {
        try {
          const stdout = execSync(cmdStr, { stdio: 'pipe' }).toString();
          const match = /REG_SZ\s+(.+)$/im.exec(stdout);
          if (match && match[1]) {
            const regPath = match[1].trim().replace(/^"/, '').replace(/"$/, '');
            if (fs.existsSync(regPath)) return regPath;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  // 2. Check PATH environment variable via `where`
  try {
    if (os.platform() === 'win32') {
      const stdout = execSync('where chrome.exe', { stdio: 'pipe' }).toString();
      const firstPath = stdout.split(/\r?\n/)[0]?.trim();
      if (firstPath && fs.existsSync(firstPath)) return firstPath;
    }
  } catch (_) {}

  // 3. Standard hardcoded paths
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
    process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe') : '',
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

  // Attempt direct 'start chrome' command
  try {
    execSync(`start chrome "${target}"`, { stdio: 'ignore' });
    return true;
  } catch (_) {}

  // Fallback to system default browser via Electron shell
  shell.openExternal(target);
  return false;
}

module.exports = {
  getChromeExecutablePath,
  openInChromeOrSystemDefault,
};
