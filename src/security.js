/* ------------------------------------------------------------------ */
/* Content protection & anti-duplication engine (ported from          */
/* sports-week-register): blocks context menu, selection/copying,     */
/* drag-out, view-source / save / print / inspect shortcuts, and      */
/* foreign iframe embedding.                                          */
/* ------------------------------------------------------------------ */
export const PROTECTION_NOTICE =
  'Protected Asset: Our Kirtipur. Unauthorized duplication, extraction, or reproduction is prohibited.';

let sessionFingerprint = null;

export function getSessionFingerprint() {
  if (sessionFingerprint) return sessionFingerprint;
  const entropy = [
    Date.now(),
    Math.random().toString(36).substring(2, 10),
    typeof navigator !== 'undefined' ? (navigator.userAgent || '').length : 0,
    typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'std'
  ].join('-');
  let hash = 0;
  for (let i = 0; i < entropy.length; i++) {
    hash = (hash << 5) - hash + entropy.charCodeAt(i);
    hash |= 0;
  }
  sessionFingerprint = `KM-SEC-${Math.abs(hash).toString(16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  return sessionFingerprint;
}

export function showProtectionToast(reason = 'Action Restricted') {
  if (typeof document === 'undefined' || !document.body) return;
  const old = document.getElementById('security-protection-toast');
  if (old && old.parentElement) old.parentElement.removeChild(old);

  const toast = document.createElement('div');
  toast.id = 'security-protection-toast';
  toast.className = 'security-toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icon = document.createElement('div');
  icon.className = 'security-toast-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '🛡️';

  const body = document.createElement('div');
  body.className = 'security-toast-body';
  const title = document.createElement('div');
  title.className = 'security-toast-title';
  title.textContent = 'Protected Content';
  const desc = document.createElement('div');
  desc.className = 'security-toast-desc';
  desc.textContent = reason;
  body.append(title, desc);

  toast.append(icon, body);
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, 15px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 2600);
}

export function handleProtectedKeydown(e) {
  if (!e) return false;
  const key = (e.key || '').toLowerCase();
  const isCtrlOrCmd = Boolean(e.ctrlKey || e.metaKey);
  const isShift = Boolean(e.shiftKey);
  const isMacAlt = Boolean(e.metaKey && e.altKey);
  const target = e.target;
  const isInputField =
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  if (key === 'f12') {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('Developer inspection tools are disabled.');
    return true;
  }
  if (((isCtrlOrCmd && isShift) || isMacAlt) && (key === 'i' || key === 'j' || key === 'c')) {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('Element inspection and console shortcuts are disabled.');
    return true;
  }
  if ((isCtrlOrCmd || isMacAlt) && key === 'u') {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('View Page Source is disabled.');
    return true;
  }
  if (isCtrlOrCmd && key === 's') {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('Saving or exporting raw HTML is restricted.');
    return true;
  }
  if (isCtrlOrCmd && key === 'p') {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('Printing and page duplication are disabled.');
    return true;
  }
  if (isCtrlOrCmd && key === 'c' && !isInputField) {
    e.preventDefault();
    e.stopPropagation();
    showProtectionToast('Content copying is disabled.');
    return true;
  }
  return false;
}

export function handleProtectedClipboard(e) {
  if (!e) return;
  const target = e.target;
  const isInputField =
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (isInputField) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
  if (e.clipboardData && typeof e.clipboardData.setData === 'function') {
    try { e.clipboardData.setData('text/plain', PROTECTION_NOTICE); } catch (_) {}
  }
  showProtectionToast('Text selection and clipboard copying are protected.');
}

export function handleContextMenu(e) {
  if (!e) return;
  const target = e.target;
  const isInputField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
  if (isInputField) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
}

export function handleDragStart(e) {
  if (!e) return;
  if (typeof e.preventDefault === 'function') e.preventDefault();
}

export function checkFrameSecurity() {
  if (typeof window === 'undefined') return;
  try {
    if (window.top && window.top !== window.self) {
      const parentOrigin = window.top.location.origin;
      if (parentOrigin !== window.location.origin) {
        window.top.location.href = window.self.location.href;
      }
    }
  } catch (_) {
    try {
      window.top.location.href = window.self.location.href;
    } catch (err) {
      console.warn('Frame security boundary active.');
    }
  }
}

export function initContentProtection(options = {}) {
  const {
    protectHotkeys = true,
    protectContextMenu = true,
    protectClipboard = true,
    protectDrag = true,
    antiIframe = true
  } = options;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { active: false, fingerprint: getSessionFingerprint() };
  }

  if (antiIframe) checkFrameSecurity();
  if (protectContextMenu) window.addEventListener('contextmenu', handleContextMenu, { capture: true });
  if (protectClipboard) {
    window.addEventListener('copy', handleProtectedClipboard, { capture: true });
    window.addEventListener('cut', handleProtectedClipboard, { capture: true });
  }
  if (protectDrag) window.addEventListener('dragstart', handleDragStart, { capture: true });
  if (protectHotkeys) window.addEventListener('keydown', handleProtectedKeydown, { capture: true });

  const fingerprint = getSessionFingerprint();
  const root = document.querySelector('.app') || document.body;
  if (root && typeof root.setAttribute === 'function') {
    root.setAttribute('data-security-fingerprint', fingerprint);
    root.setAttribute('data-protected-content', 'true');
  }

  if (typeof console !== 'undefined' && typeof console.log === 'function') {
    console.log(
      `%c🛡️ OUR KIRTIPUR %c PROTECTED CONTENT ENGINE %c [${fingerprint}]`,
      'background: #9e3b26; color: #ffffff; font-weight: bold; padding: 3px 6px; border-radius: 4px 0 0 4px;',
      'background: #17130f; color: #f5b841; font-weight: bold; padding: 3px 6px;',
      'background: #26221f; color: #cfc8c0; padding: 3px 6px; border-radius: 0 4px 4px 0;'
    );
  }

  return {
    active: true,
    fingerprint,
    options: { protectHotkeys, protectContextMenu, protectClipboard, protectDrag, antiIframe }
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  initContentProtection();
}
