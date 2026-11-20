export const workspaceSizeKey = 'data-saver-workspace-size';
export const minimumTextSize = 85;
export const maximumTextSize = 175;
export const textSizeStep = 5;

export function normalizeTextSize(value) {
  const number = Number(value);
  if (value == null || String(value).trim() === '' || !Number.isFinite(number)) return 100;
  const nearestStep = Math.round(number / textSizeStep) * textSizeStep;
  return Math.min(maximumTextSize, Math.max(minimumTextSize, nearestStep));
}

export function readWorkspaceTextSize() {
  try { return normalizeTextSize(localStorage.getItem(workspaceSizeKey)); }
  catch { return 100; }
}
