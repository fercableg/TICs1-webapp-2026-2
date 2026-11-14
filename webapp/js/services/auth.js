// ============================================================================
// auth.js — Frontend role-based access control (RBAC).
//
// Two roles: `admin` (full access) and `client` (caregiver — restricted view).
// Solo existe una cuenta de demostración (admin). El resto de usuarios se
// registran desde la página y quedan con rol `client` (nunca admin).
// The session lives in sessionStorage (cleared when the tab closes). Theme and
// device selection persist in localStorage (see theme.js / navbar.js).
//
// User model (public, exposed to the UI):
//   { username, role, name, email, photo }
// `photo` is a data URL (downscaled avatar) or null. Identity fields
// (username/password/role) live in DEMO_USERS / `afic.users`; mutable profile
// fields (name/email/photo) live as overrides in `afic.profile` keyed by
// username, so demo accounts can also personalize their profile.
//
// NOTE: this is a DEMO auth layer. A production deployment would delegate to
// Supabase Auth (signInWithPassword) and derive the role from a `profiles`
// table or a custom access-token claim — not from a hard-coded list.
// ============================================================================

const SESSION_KEY = 'afic.session';
const USERS_KEY = 'afic.users'; // usuarios registrados (localStorage, demo-only)
const PROFILE_KEY = 'afic.profile'; // { username: { name?, email?, photo? } }

export const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
};

export const DEMO_USERS = [
  { username: 'admin', password: 'password', role: ROLES.ADMIN, name: 'Administrador', email: 'admin@bedsense.cl' },
];

// Storage is wrapped so the module is also importable from a Node smoke test
// (where sessionStorage/localStorage do not exist). An in-memory fallback keeps
// register→login→updateProfile testable without a browser.
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

let memoryUsers = [];
const usersStore = {
  get() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : memoryUsers;
    } catch {
      return memoryUsers;
    }
  },
  set(users) {
    memoryUsers = users;
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* ignore */
    }
  },
};

let memoryProfile = {};
const profileStore = {
  get() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : memoryProfile;
    } catch {
      return memoryProfile;
    }
  },
  set(map) {
    memoryProfile = map;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  },
};

function normalized(value) {
  return String(value ?? '').trim().toLowerCase();
}

function registeredUsers() {
  const list = usersStore.get();
  return Array.isArray(list) ? list : [];
}

function profileOverrides() {
  const map = profileStore.get();
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

function allUsers() {
  return [...DEMO_USERS, ...registeredUsers()];
}

function isDemoUser(username) {
  const uname = normalized(username);
  return DEMO_USERS.some((u) => u.username === uname);
}

// Merges identity (base) with profile overrides into the public user shape.
function mergeUser(base) {
  const ov = profileOverrides()[base.username] || {};
  return {
    username: base.username,
    role: base.role,
    name: ov.name ?? base.name ?? base.username,
    email: ov.email ?? base.email ?? '',
    photo: ov.photo ?? base.photo ?? null,
  };
}

export function login(username, password) {
  const uname = normalized(username);
  const found = allUsers().find((u) => u.username === uname && u.password === password);
  if (!found) return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  const user = mergeUser(found);
  sessionStore.set(JSON.stringify(user));
  return { ok: true, user };
}

// Registers a new local account (role always `client`). Returns the same shape
// as login(): { ok, user } | { ok, error }.
export function register({ name, username, password, email = '' }) {
  const uname = normalized(username);
  const nombre = String(name ?? '').trim();
  if (!nombre) return { ok: false, error: 'El nombre es obligatorio.' };
  if (!uname) return { ok: false, error: 'El usuario es obligatorio.' };
  if (!password || password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  const taken = allUsers().some((u) => u.username === uname);
  if (taken) return { ok: false, error: 'Ese nombre de usuario ya está en uso.' };

  const base = { username: uname, role: ROLES.CLIENT, name: nombre, password };
  usersStore.set([...registeredUsers(), base]);

  const emailTrimmed = String(email).trim();
  if (emailTrimmed) {
    const overrides = profileOverrides();
    overrides[uname] = { ...(overrides[uname] || {}), email: emailTrimmed };
    profileStore.set(overrides);
  }

  return { ok: true, user: mergeUser(base) };
}

// Updates mutable profile fields of the current user (name, email, photo) and
// optionally renames a *registered* account (demo credentials are fixed).
// Persists overrides, refreshes the session, and returns { ok, user }.
export function updateProfile(username, patch = {}) {
  const oldUname = normalized(username);
  const base = allUsers().find((u) => u.username === oldUname);
  if (!base) return { ok: false, error: 'Usuario no encontrado.' };

  let uname = oldUname;

  if (patch.username !== undefined && normalized(patch.username) !== oldUname) {
    if (isDemoUser(oldUname)) {
      return { ok: false, error: 'No puedes cambiar el usuario de una cuenta de demostración.' };
    }
    const newUname = normalized(patch.username);
    if (!newUname) return { ok: false, error: 'El usuario no puede estar vacío.' };
    if (allUsers().some((u) => u.username === newUname)) {
      return { ok: false, error: 'Ese nombre de usuario ya está en uso.' };
    }
    const list = registeredUsers();
    const idx = list.findIndex((u) => u.username === oldUname);
    if (idx === -1) return { ok: false, error: 'Usuario no encontrado.' };
    list[idx] = { ...list[idx], username: newUname };
    usersStore.set(list);
    uname = newUname;
  }

  const overrides = profileOverrides();
  const next = { ...(overrides[oldUname] || {}) };
  if (patch.name !== undefined) next.name = String(patch.name).trim() || base.name;
  if (patch.email !== undefined) next.email = String(patch.email).trim();
  if (patch.photo !== undefined) next.photo = patch.photo || null;

  delete overrides[oldUname];
  overrides[uname] = next;
  profileStore.set(overrides);

  const user = mergeUser({ ...base, username: uname });
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
