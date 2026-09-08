const NEXT_KEY = 'speakup_next';

export function safeAppPath(value, fallback = '/app') {
  if (typeof value !== 'string') return fallback;
  const path = value.trim();
  if (!path.startsWith('/app')) return fallback;
  if (path.startsWith('//') || path.includes('\\') || /:\/\//.test(path)) return fallback;
  return path;
}

export function rememberNextPath(path) {
  const safe = safeAppPath(path, '');
  if (!safe) return;
  try {
    sessionStorage.setItem(NEXT_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function peekNextPath(fallback = '/app') {
  try {
    return safeAppPath(sessionStorage.getItem(NEXT_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function consumeNextPath(fallback = '/app') {
  try {
    const stored = sessionStorage.getItem(NEXT_KEY);
    if (stored) sessionStorage.removeItem(NEXT_KEY);
    return safeAppPath(stored, fallback);
  } catch {
    return fallback;
  }
}
