// ============================================================================
// registro.js — Vista de registro de cuenta a pantalla completa.
// El esqueleto vive en registro.html; aquí solo se monta la tarjeta compartida
// de views/authCard.js (modo "register") dentro de #view-root.
// ============================================================================

import { authCard } from './authCard.js';

export function init(root) {
  const { node } = authCard({ mode: 'register' });
  root.replaceChildren(node);
  return () => {};
}
