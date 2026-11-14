// ============================================================================
// login.js — Vista de login a pantalla completa (sin usuarios demo visibles).
// El esqueleto vive en login.html; aquí solo se monta la tarjeta compartida
// de views/authCard.js dentro de #view-root (que ya es un <main class="login-screen">).
// ============================================================================

import { authCard } from './authCard.js';

export function init(root) {
  const { node } = authCard({ mode: 'login' });
  root.replaceChildren(node);
  return () => {};
}
