export function openExternalUrl(url: string, targetName = '_blank'): boolean {
  if (!url) return false;

  let formattedUrl = url.trim();
  if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://') && !formattedUrl.startsWith('file://')) {
    formattedUrl = 'https://' + formattedUrl;
  }

  // 1. Primary fast window.open call
  try {
    const win = window.open(formattedUrl, targetName, 'noopener,noreferrer');
    if (win && !win.closed) {
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

  // 2. Single anchor fallback if window.open was blocked by popup settings
  try {
    const a = document.createElement('a');
    a.href = formattedUrl;
    a.target = targetName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    const evt = new MouseEvent('click', { view: window, bubbles: true, cancelable: true });
    a.dispatchEvent(evt);
    document.body.removeChild(a);
    return true;
  } catch (e) {
    console.warn('Anchor fallback failed:', e);
  }

  // 3. Absolute direct location fallback
  try {
    window.location.href = formattedUrl;
    return true;
  } catch (e) {
    console.error('All browser open strategies failed:', e);
    return false;
  }
}
