// ============================================================================
// profile.js — Perfil del usuario autenticado. El formulario vive en
// profile.html; aquí se hidratan los campos y se vincula la lógica de foto,
// nombre, correo y (solo cuentas registradas) nombre de usuario.
// ============================================================================

import { getSession, updateProfile, DEMO_USERS } from '../services/auth.js';
import { getState, setState } from '../services/store.js';
import { toast } from '../core/ui.js';

// Lee una imagen y la reduce a un avatar cuadrado (data URL) para que quepa en
// localStorage sin inflar la cuota.
function downscaleImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La imagen no es válida.'));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function init(root) {
  const user = getSession() ?? getState().user ?? null;
  const isDemoAccount = !!user && DEMO_USERS.some((u) => u.username === user.username);

  let draftPhoto = user?.photo ?? null;

  const preview = root.querySelector('#profile-photo');
  const placeholder = root.querySelector('#profile-photo-empty');
  const fileInput = root.querySelector('#profile-photo-input');
  const photoBtn = root.querySelector('#profile-photo-btn');
  const removeBtn = root.querySelector('#profile-photo-remove');
  const nameInput = root.querySelector('#profile-name');
  const userInput = root.querySelector('#profile-user');
  const userHint = root.querySelector('#profile-user-hint');
  const emailInput = root.querySelector('#profile-email');
  const errorEl = root.querySelector('#profile-error');
  const form = root.querySelector('#profile-form');

  nameInput.value = user?.name ?? '';
  userInput.value = user?.username ?? '';
  emailInput.value = user?.email ?? '';

  if (isDemoAccount) {
    userInput.disabled = true;
    userHint.hidden = false;
  }

  function refreshPhoto() {
    if (draftPhoto) {
      preview.src = draftPhoto;
      preview.hidden = false;
      placeholder.hidden = true;
    } else {
      preview.hidden = true;
      preview.removeAttribute('src');
      placeholder.hidden = false;
    }
  }

  photoBtn.addEventListener('click', () => fileInput.click());
  removeBtn.addEventListener('click', () => { draftPhoto = null; refreshPhoto(); });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      draftPhoto = await downscaleImage(file);
      refreshPhoto();
    } catch (err) {
      toast(err.message || 'No se pudo cargar la imagen.', 'warning');
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    if (!user) {
      toast('No hay sesión iniciada.', 'warning');
      return;
    }
    const res = updateProfile(user.username, {
      name: nameInput.value,
      username: userInput.value,
      email: emailInput.value,
      photo: draftPhoto,
    });
    if (!res.ok) {
      errorEl.textContent = res.error;
      errorEl.hidden = false;
      return;
    }
    setState({ user: res.user });
    toast('Perfil actualizado.', 'success');
  });

  refreshPhoto();

  return () => {};
}
