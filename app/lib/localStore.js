const KEY = 'stageflow-state';

export function loadAppState(fallback) {
  try {
    const text = window.localStorage.getItem(KEY);
    if (!text) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function saveAppState(state) {
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearAppState() {
  window.localStorage.removeItem(KEY);
}
