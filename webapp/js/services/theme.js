// ============================================================================
// theme.js — Dark/light theme management, persisted in localStorage.
// ============================================================================

const KEY = 'afic.theme';

// Storage is wrapped so this module also imports cleanly in a Node smoke test.
const store = {
  get() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
  },
};

export function initTheme() {
  const saved = store.get();
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light');
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  store.set(theme);
}
