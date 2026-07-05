import { subscribe } from '../state';
import {
  settings,
  setQuality,
  setFormat,
  toggleResizeTarget,
  setIncludeOriginal,
} from '../state';
import type { OutputFormat } from '../types';
import { MIN_QUALITY, MAX_QUALITY, QUALITY_STEP } from '../constants';

/**
 * Renders the settings panel – quality slider, format selector,
 * resize target toggles, and the "include original" checkbox.
 */
export function renderSettings(container: HTMLElement): void {
  container.innerHTML = `
    <section class="settings-panel" aria-label="Optimization settings">
      <h2 class="section-heading">Settings</h2>

      <div class="setting-group">
        <label class="setting-label" for="quality-slider">
          Quality: <strong id="quality-display">80%</strong>
        </label>
        <input
          type="range"
          id="quality-slider"
          class="slider"
          min="${MIN_QUALITY}"
          max="${MAX_QUALITY}"
          step="${QUALITY_STEP}"
          value="${settings.quality}"
          aria-label="Compression quality"
        />
        <div class="slider-labels">
          <span>10%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label">Output Format</label>
        <div class="format-tabs" id="format-tabs" role="radiogroup" aria-label="Output format">
          ${renderFormatTab('webp', settings.outputFormat)}
          ${renderFormatTab('jpeg', settings.outputFormat)}
          ${renderFormatTab('png', settings.outputFormat)}
        </div>
      </div>

      <div class="setting-group">
        <label class="setting-label">Resize Targets</label>
        <div class="resize-targets" id="resize-targets">
          ${settings.resizeTargets
            .map(
              (t, i) => `
            <label class="checkbox-label">
              <input type="checkbox" data-target="${i}" ${t.enabled ? 'checked' : ''} />
              <span>${t.label} (${t.maxWidth}px max width)</span>
            </label>
          `,
            )
            .join('')}
        </div>
      </div>

      <div class="setting-group">
        <label class="checkbox-label">
          <input type="checkbox" id="include-original" ${settings.includeOriginalSize ? 'checked' : ''} />
          <span>Include Original Size (optimised, full resolution)</span>
        </label>
      </div>
    </section>
  `;

  // ----- wire events -----

  const slider = document.getElementById('quality-slider') as HTMLInputElement;
  const display = document.getElementById('quality-display')!;

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    display.textContent = `${Math.round(val * 100)}%`;
    setQuality(val);
  });

  document.getElementById('format-tabs')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-format]');
    if (!btn) return;
    setFormat(btn.dataset.format as OutputFormat);
  });

  document.getElementById('resize-targets')!.addEventListener('change', (e) => {
    const cb = e.target as HTMLInputElement;
    const idx = Number(cb.dataset.target);
    if (!isNaN(idx)) toggleResizeTarget(idx);
  });

  document.getElementById('include-original')!.addEventListener('change', (e) => {
    setIncludeOriginal((e.target as HTMLInputElement).checked);
  });

  // Keep DOM in sync with state
  subscribe(() => {
    const s = settings;
    slider.value = String(s.quality);
    display.textContent = `${Math.round(s.quality * 100)}%`;

    // Update format tabs
    const tabs = document.getElementById('format-tabs')!;
    tabs.innerHTML = `${renderFormatTab('webp', s.outputFormat)}${renderFormatTab('jpeg', s.outputFormat)}${renderFormatTab('png', s.outputFormat)}`;

    // Update resize checkboxes
    document.querySelectorAll<HTMLInputElement>('#resize-targets input[type=checkbox]').forEach((cb) => {
      const idx = Number((cb as HTMLInputElement).dataset.target);
      if (!isNaN(idx)) cb.checked = s.resizeTargets[idx]?.enabled ?? true;
    });

    (document.getElementById('include-original') as HTMLInputElement).checked = s.includeOriginalSize;
  });
}

/** Generate a format tab button */
function renderFormatTab(fmt: OutputFormat, active: OutputFormat): string {
  const selected = fmt === active ? ' aria-checked="true" class="format-tab format-tab--active"' : ' class="format-tab"';
  return `<button role="radio" data-format="${fmt}"${selected}>${fmt.toUpperCase()}</button>`;
}