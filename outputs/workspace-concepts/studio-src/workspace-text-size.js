import {workspaceSizeKey,minimumTextSize,maximumTextSize,textSizeStep,normalizeTextSize} from './workspace-text-preference.js';

export function setWorkspaceTextSize(value, persist = true) {
  const size = normalizeTextSize(value);
  const style = document.documentElement.style;
  style.setProperty('--workspace-text-scale', size / 100);
  style.setProperty('--workspace-size-fill', workspaceRangeFill(size, minimumTextSize, maximumTextSize));
  if (persist) {
    try { localStorage.setItem(workspaceSizeKey, String(size)); } catch {}
  }
  return size;
}

export function workspaceRangeFill(value, min, max) {
  const percent = 100 * (value - min) / (max - min);
  return Number(percent.toFixed(4)) + '%';
}

export function workspaceRangeInput({id, min, max, step, value, valueText, control}) {
  const attributes = control ? ` data-control="${control}"` : '';
  const fill = control ? ` style="--range-fill:${workspaceRangeFill(value,min,max)}"` : '';
  return `<div class="workspace-range${control ? '' : ' workspace-size-slider'}"${fill}>
    <span class="workspace-range-rail" aria-hidden="true"></span>
    <input class="workspace-range-input" id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${valueText}"${attributes}>
  </div>`;
}

export function workspaceTextSizeControl(value) {
  const size = normalizeTextSize(value);
  return `<div class="workspace-size">
    <div class="workspace-size-readout"><label for="workspace-size">Text size</label><output id="workspace-size-value" for="workspace-size" aria-hidden="true">${size}%</output></div>
    ${workspaceRangeInput({id:'workspace-size',min:minimumTextSize,max:maximumTextSize,step:textSizeStep,value:size,valueText:size+' percent'})}
  </div>`;
}

export function syncWorkspaceTextSize(controlRoot, size) {
  const slider = controlRoot.querySelector('#workspace-size');
  if (!slider) return;
  if (slider.value !== String(size)) slider.value = String(size);
  slider.setAttribute('aria-valuetext', size + ' percent');
  const output = controlRoot.querySelector('#workspace-size-value');
  if (output) output.textContent = size + '%';
}
