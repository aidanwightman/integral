export const glassClarityKey = 'data-saver-glass-clarity';
export const glassMaterialKey = 'data-saver-glass-material-v1';

export function readGlassPreferences() {
  let shared, material;
  try { shared = localStorage.getItem(glassClarityKey); } catch {}
  try { material = JSON.parse(localStorage.getItem(glassMaterialKey)); } catch {}

  let clarity = true;
  if (shared === 'true' || shared === 'false') clarity = shared === 'true';
  else if (typeof material?.clarity === 'boolean') clarity = material.clarity;
  return { mode: material?.mode === 'dark' ? 'dark' : 'light', clarity };
}

export function observeGlassClarity(update) {
  window.addEventListener('storage', event => {
    if (event.key === glassClarityKey || event.key === glassMaterialKey || event.key === null)
      update(readGlassPreferences().clarity);
  });
}
