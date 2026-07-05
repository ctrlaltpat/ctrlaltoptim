import type { OutputFormat, ProcessingSettings } from '../types';
import { STORAGE_KEYS } from '../types';
import { DEFAULT_FORMAT, DEFAULT_QUALITY } from '../constants';

/**
 * Persist the current processing settings to localStorage so the user's
 * preferences survive page reloads.
 */
export function saveSettings(settings: ProcessingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUALITY, String(settings.quality));
    localStorage.setItem(STORAGE_KEYS.FORMAT, settings.outputFormat);
    localStorage.setItem(STORAGE_KEYS.INCLUDE_ORIGINAL, String(settings.includeOriginalSize));
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) – ignore silently
  }
}

/**
 * Restore previously-saved settings or return sensible defaults.
 */
export function loadSettings(): ProcessingSettings {
  let quality = DEFAULT_QUALITY;
  let outputFormat: OutputFormat = DEFAULT_FORMAT;
  let includeOriginalSize = false;

  try {
    const q = localStorage.getItem(STORAGE_KEYS.QUALITY);
    if (q !== null) quality = Number(q) || DEFAULT_QUALITY;

    const f = localStorage.getItem(STORAGE_KEYS.FORMAT);
    if (f === 'webp' || f === 'jpeg' || f === 'png') outputFormat = f;

    const i = localStorage.getItem(STORAGE_KEYS.INCLUDE_ORIGINAL);
    if (i !== null) includeOriginalSize = i === 'true';
  } catch {
    // Ignore – fall back to defaults
  }

  return { quality, outputFormat, includeOriginalSize, resizeTargets: [] };
}