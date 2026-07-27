export function openExternalUrl(url: string, targetName = '_blank'): boolean {
  if (!url) return false;

  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  // Primary fast window.open call
  try {
    const win = window.open(formattedUrl, targetName, 'noopener,noreferrer');
    if (win) {
      try {
        win.focus();
      } catch {
        // ignore cross-origin focus limits
      }
      return true;
    }
  } catch (e) {
    console.warn('window.open blocked or throttled:', e);
  }

  // Single anchor fallback if window.open was blocked by popup settings
  try {
    const a = document.createElement('a');
    a.href = formattedUrl;
    a.target = targetName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.warn('Anchor fallback failed:', e);
  }

  return false;
}
