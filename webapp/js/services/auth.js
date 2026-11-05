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
const USERS_KEY = 'afic.users'; // usuarios registrados (localStorage, demo-only)

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

// Registered users live in localStorage (persist across browser restarts).
// Plaintext passwords are acceptable for this local demo; a real deployment
// would use Supabase Auth (signUp + profiles table) instead.
const usersStore = {
  get() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  set(users) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  },
};

function registeredUsers() {
  const list = usersStore.get();
  return Array.isArray(list) ? list : [];
}

export function login(username, password) {
  const uname = String(username ?? '').trim().toLowerCase();
  const found = [...DEMO_USERS, ...registeredUsers()].find(
    (u) => u.username === uname && u.password === password,
  );
  if (!found) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  const user = { username: found.username, role: found.role, name: found.name };
  sessionStore.set(JSON.stringify(user));
  return { ok: true, user };
}

// Registers a new local account (role always `client`). Returns the same shape
// as login(): { ok, user } | { ok, error }.
export function register({ name, username, password }) {
  const uname = String(username ?? '').trim().toLowerCase();
  const nombre = String(name ?? '').trim();
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!uname) return { ok: false, error: 'El usuario es obligatorio.' };
  if (!password || password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  const taken = [...DEMO_USERS, ...registeredUsers()].some((u) => u.username === uname);
  if (taken) return { ok: false, error: 'Ese nombre de usuario ya está en uso.' };

  const user = { username: uname, role: ROLES.CLIENT, name: nombre };
  usersStore.set([...registeredUsers(), user]);
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
