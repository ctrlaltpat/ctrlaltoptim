import type { ImageFile, OutputFormat, ProcessedImage, ProcessingSettings, ProcessingStats } from './types';
import { RESIZE_TARGETS } from './constants';
import { loadSettings, saveSettings } from './utils/storage';

/* ------------------------------------------------------------------ */
/*  Tiny pub/sub event bus                                             */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function emit(): void {
  listeners.forEach((fn) => fn());
}

/** Subscribe to state changes.  Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------------ */
/*  Application state                                                  */
/* ------------------------------------------------------------------ */

const saved = loadSettings();

/** Uploaded images that have not been processed yet */
export let imageQueue: ImageFile[] = [];

/** User-adjustable settings persisted across sessions */
export let settings: ProcessingSettings = {
  quality: saved.quality,
  outputFormat: saved.outputFormat,
  resizeTargets: RESIZE_TARGETS.map((t) => ({ ...t })),
  includeOriginalSize: saved.includeOriginalSize,
};

/** Results after processing */
export let processedImages: ProcessedImage[] = [];

/** Aggregate statistics from the last processing run */
export let stats: ProcessingStats = {
  totalImages: 0,
  originalTotalSize: 0,
  optimisedTotalSize: 0,
  totalTimeMs: 0,
};

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Add one or more images to the queue */
export function enqueueImages(images: ImageFile[]): void {
  imageQueue = [...imageQueue, ...images];
  emit();
}

/** Remove a single image from the queue by ID */
export function removeFromQueue(id: string): void {
  imageQueue = imageQueue.filter((img) => img.id !== id);
  emit();
}

/** Clear the entire queue */
export function clearQueue(): void {
  imageQueue = [];
  processedImages = [];
  stats = { totalImages: 0, originalTotalSize: 0, optimisedTotalSize: 0, totalTimeMs: 0 };
  emit();
}

/** Update quality and persist */
export function setQuality(q: number): void {
  settings = { ...settings, quality: q };
  saveSettings(settings);
  emit();
}

/** Update output format and persist */
export function setFormat(f: OutputFormat): void {
  settings = { ...settings, outputFormat: f };
  saveSettings(settings);
  emit();
}

/** Toggle a resize target */
export function toggleResizeTarget(index: number): void {
  const targets = settings.resizeTargets.map((t, i) =>
    i === index ? { ...t, enabled: !t.enabled } : t,
  );
  settings = { ...settings, resizeTargets: targets };
  emit();
}

/** Toggle the "include original size" checkbox */
export function setIncludeOriginal(v: boolean): void {
  settings = { ...settings, includeOriginalSize: v };
  saveSettings(settings);
  emit();
}

/** Clear processed results (called before a new pipeline run) */
export function resetProcessedImages(): void {
  processedImages = [];
  emit();
}

/** Store processing results */
export function setProcessedImages(images: ProcessedImage[]): void {
  processedImages = [...processedImages, ...images];
  emit();
}

/** Recompute and update aggregate stats.
 *
 * "Optimised Size" counts exactly one output variant per source image
 * so it can be compared meaningfully against the original total.  When
 * the "include original size" variant exists we use that (it is the
 * direct counterpart); otherwise we pick the smallest per-source variant.
 */
export function recomputeStats(): void {
  const originalTotalSize = imageQueue.reduce((sum, img) => sum + img.metadata.originalSize, 0);

  // Group processed images by sourceId
  const bySource = new Map<string, ProcessedImage[]>();
  for (const img of processedImages) {
    const bucket = bySource.get(img.sourceId);
    if (bucket) bucket.push(img);
    else bySource.set(img.sourceId, [img]);
  }

  // Pick one representative variant per source
  let optimisedTotalSize = 0;
  for (const variants of bySource.values()) {
    const originalVariant = variants.find((v) =>
      v.variant.startsWith('Original'),
    );
    if (originalVariant) {
      optimisedTotalSize += originalVariant.size;
    } else {
      // No original-size variant — use the smallest output for this source
      let min = Infinity;
      for (const v of variants) {
        if (v.size < min) min = v.size;
      }
      if (min !== Infinity) optimisedTotalSize += min;
    }
  }

  const totalTimeMs = processedImages.reduce((sum, img) => sum + img.timeMs, 0);

  stats = {
    totalImages: imageQueue.length,
    originalTotalSize,
    optimisedTotalSize,
    totalTimeMs,
  };
  emit();
}