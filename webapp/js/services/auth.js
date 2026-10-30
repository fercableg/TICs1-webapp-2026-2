// ============================================================================
// auth.js — Frontend role-based access control (RBAC).
//
// Two roles: `admin` (full access) and `client` (caregiver — restricted view).
// The session lives in sessionStorage (cleared when the tab closes). Theme and
// device selection persist in localStorage (see theme.js / navbar.js).
//
// NOTE: this is a DEMO auth layer. A production deployment would delegate to
// Supabase Auth (signInWithPassword) and derive the role from a `profiles`
// table or a custom access-token claim — not from a hard-coded list.
// ============================================================================

const SESSION_KEY = 'afic.session';

export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
};

export const DEMO_USERS = [
  { username: 'admin', password: 'admin123', role: ROLES.ADMIN, name: 'Administrador' },
  { username: 'cliente', password: 'cliente123', role: ROLES.CLIENT, name: 'Cuidador/a' },
];

// Storage is wrapped so the module is also importable from a Node smoke test
// (where sessionStorage does not exist).
const sessionStore = {
  get() {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(SESSION_KEY, value);
    } catch {
      /* ignore */
    }
  },
  del() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  },
};

export function login(username, password) {
  const found = DEMO_USERS.find(
    (u) => u.username === String(username ?? '').trim().toLowerCase() && u.password === password,
  );
  if (!found) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  const user = { username: found.username, role: found.role, name: found.name };
  sessionStore.set(JSON.stringify(user));
  return { ok: true, user };
}

export function getSession() {
  try {
    const raw = sessionStore.get();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStore.del();
}

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}
