// ============================================================================
// ui.js — Global UI primitives: toasts and the network-status banner.
// ============================================================================

import { el } from './dom.js';

let toastRoot = null;
let bannerRoot = null;

export function initUI() {
  if (!document.getElementById('toast-root')) {
    toastRoot = el('div', { id: 'toast-root', class: 'toast-root', 'aria-live': 'polite' });
    document.body.appendChild(toastRoot);
  }
  if (!document.getElementById('banner-root')) {
    bannerRoot = el('div', { id: 'banner-root', class: 'banner-root' });
    document.body.appendChild(bannerRoot);
  }
}

// type: 'info' | 'success' | 'warning' | 'error'
export function toast(message, type = 'info', timeout = 4200) {
  if (!toastRoot) initUI();
  const node = el('div', {
    class: `toast toast--${type}`,
    role: 'status',
    onclick: () => node.remove(),
  }, el('span', { class: 'toast__msg', text: message }));
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), timeout);
  return node;
}

let bannerVisible = false;

// Show the non-intrusive connection banner with a manual retry action.
export function showNetworkBanner(message, onRetry) {
  if (!bannerRoot) initUI();
  bannerRoot.replaceChildren(
    el('div', { class: 'banner banner--error', role: 'alert' },
      el('span', { class: 'banner__icon', text: '⚠' }),
      el('span', { class: 'banner__msg', text: message }),
      el('button', {
        class: 'banner__retry',
        type: 'button',
        text: 'Reintentar',
        onclick: () => { onRetry?.(); },
      }),
      el('button', {
        class: 'banner__close',
        type: 'button',
        'aria-label': 'Cerrar',
        text: '✕',
        onclick: hideNetworkBanner,
      }),
    ),
  );
  bannerVisible = true;
}

export function hideNetworkBanner() {
  if (bannerRoot) bannerRoot.replaceChildren();
  bannerVisible = false;
}

export function isBannerVisible() {
  return bannerVisible;
}
