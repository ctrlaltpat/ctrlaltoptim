import type { OutputFormat, SupportedMimeType } from '../types';
import { FORMAT_EXT, FORMAT_MIME, MIME_LABELS } from '../constants';

/**
 * Return the human-readable label for a supported MIME type.
 * Falls back to the raw MIME string for unrecognised types.
 */
export function getMimeLabel(mime: string): string {
  return (MIME_LABELS as Record<string, string>)[mime] ?? mime;
}

/**
 * Return the file extension (with dot) for a given output format.
 */
export function getFormatExtension(format: OutputFormat): string {
  return FORMAT_EXT[format];
}

/**
 * Return the MIME type string for a given output format.
 */
export function getFormatMime(format: OutputFormat): string {
  return FORMAT_MIME[format];
}

/**
 * Look up the OutputFormat from a SupportedMimeType string.
 * Returns 'webp' for any unrecognised value as safe fallback.
 */
export function mimeToFormat(mime: SupportedMimeType): OutputFormat {
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  return 'webp'; // webp / avif / unknown → webp
}

/**
 * Generate a clean filename (without extension) from an original path.
 */
export function baseFilename(path: string): string {
  const base = path.replace(/^.*[/\\]/, ''); // strip directory
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

/**
 * Format file size in human-friendly form (e.g. "1.4 MB").
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration given in milliseconds to a readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}