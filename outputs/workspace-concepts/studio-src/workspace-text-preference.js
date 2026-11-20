export const defaultWorkspaceTextSize = 100;

// Retire the preference saved by earlier demos. New visits keep their size in memory.
try { localStorage.removeItem('data-saver-workspace-size'); } catch {}
export const minimumTextSize = 85;
export const maximumTextSize = 175;
export const textSizeStep = 5;

export function normalizeTextSize(value) {
  const number = Number(value);
  if (value == null || String(value).trim() === '' || !Number.isFinite(number)) return defaultWorkspaceTextSize;
  const nearestStep = Math.round(number / textSizeStep) * textSizeStep;
  return Math.min(maximumTextSize, Math.max(minimumTextSize, nearestStep));
}
