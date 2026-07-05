import type { OutputFormat, ResizeTarget, SupportedMimeType } from './types';

/* ------------------------------------------------------------------ */
/*  Quality / Processing                                              */
/* ------------------------------------------------------------------ */

/** Minimum quality value (10 %) */
export const MIN_QUALITY = 0.1;
/** Maximum quality value (100 %) */
export const MAX_QUALITY = 1.0;
/** Step granularity for the quality slider */
export const QUALITY_STEP = 0.01;
/** Default quality (80 %) */
export const DEFAULT_QUALITY = 0.8;

/** Default output format */
export const DEFAULT_FORMAT: OutputFormat = 'webp';

/* ------------------------------------------------------------------ */
/*  Resize targets                                                     */
/* ------------------------------------------------------------------ */

/** Preset widths for downscaling.  All maintain original aspect ratio. */
export const RESIZE_TARGETS: ResizeTarget[] = [
  { label: 'Large',  maxWidth: 1920, enabled: true },
  { label: 'Medium', maxWidth: 1280, enabled: true },
  { label: 'Small',  maxWidth: 640,  enabled: true },
];

/* ------------------------------------------------------------------ */
/*  File validation                                                    */
/* ------------------------------------------------------------------ */

/** Maximum file size in bytes (20 MiB) before warning */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
/** Maximum pixel dimension before warning */
export const MAX_DIMENSION = 16_000;
/** Accepted MIME types */
export const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

/** Map OutputFormat → MIME type */
export const FORMAT_MIME: Record<OutputFormat, string> = {
  webp:  'image/webp',
  jpeg:  'image/jpeg',
  png:   'image/png',
};

/** Map OutputFormat → file extension (leading dot) */
export const FORMAT_EXT: Record<OutputFormat, string> = {
  webp: '.webp',
  jpeg: '.jpg',
  png:  '.png',
};

/** Map SupportedMimeType → human-readable label */
export const MIME_LABELS: Record<SupportedMimeType, string> = {
  'image/jpeg': 'JPEG',
  'image/png':  'PNG',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
};