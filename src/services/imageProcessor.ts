import type { ImageFile, OutputFormat, ProcessedImage, ResizeTarget } from '../types';
import { getFormatMime, mimeToFormat } from '../utils/format';
import { MAX_DIMENSION } from '../constants';

/**
 * Monotonic counter for unique processed-image IDs.
 */
let nextId = 0;

/**
 * Check whether OffscreenCanvas is available in this browser.
 */
export function supportsOffscreenCanvas(): boolean {
  return typeof OffscreenCanvas !== 'undefined';
}

/**
 * Process a single source image into all requested size variants.
 *
 * Decodes via createImageBitmap (which respects EXIF orientation via
 * the `imageOrientation: 'from-image'` flag), scales proportionally,
 * and re-encodes to the selected format at the requested quality.
 */
export async function processImage(
  source: ImageFile,
  targets: ResizeTarget[],
  format: OutputFormat,
  quality: number,
  includeOriginal: boolean,
): Promise<ProcessedImage[]> {
  // Decode with orientation correction (modern browsers handle this natively)
  const bitmap = await createImageBitmap(source.file, {
    imageOrientation: 'from-image',
  });

  const results: ProcessedImage[] = [];

  // Process each enabled resize target.
  // Skip any target whose maxWidth is >= the source width — re-encoding
  // without actually downsizing almost always inflates the file.
  const enabledTargets = targets.filter(
    (t) => t.enabled && t.maxWidth < bitmap.width,
  );
  for (const target of enabledTargets) {
    const result = await renderVariant(bitmap, target, format, quality);
    results.push({
      id: `proc-${nextId++}`,
      sourceId: source.id,
      variant: `${target.label} (${target.maxWidth}px)`,
      blob: result.blob,
      width: result.width,
      height: result.height,
      format,
      size: result.blob.size,
      timeMs: result.timeMs,
    });
  }

  // Optional full-resolution re-encoded variant.
  // Compare against the original file — if re-encoding produces a larger
  // blob we keep the original instead (canvas JPEG encoding is less
  // aggressive than dedicated encoders like mozjpeg / libwebp).
  if (includeOriginal) {
    const t0 = performance.now();
    const canvas = createCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    ctx.drawImage(bitmap, 0, 0);

    const mime = getFormatMime(format);
    const reEncoded = await canvasToBlob(canvas, mime, quality);

    // Use whichever is smaller — re-encoded or original file
    const keptOriginal = reEncoded.size >= source.file.size;
    const bestBlob = keptOriginal ? source.file.slice(0) : reEncoded;

    results.push({
      id: `proc-${nextId++}`,
      sourceId: source.id,
      variant: keptOriginal
        ? 'Original (kept — already optimal)'
        : 'Original (optimised)',
      blob: bestBlob,
      width: source.metadata.originalWidth,
      height: source.metadata.originalHeight,
      format: keptOriginal
        ? mimeToFormat(source.metadata.mimeType)
        : format,
      size: bestBlob.size,
      timeMs: performance.now() - t0,
    });
  }

  bitmap.close();
  return results;
}

/**
 * Render one size variant.
 * Scales proportionally to fit maxWidth, never upscales.
 */
async function renderVariant(
  bitmap: ImageBitmap,
  target: ResizeTarget,
  format: OutputFormat,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number; timeMs: number }> {
  const t0 = performance.now();

  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const maxW = target.maxWidth;

  // Calculate output dimensions — only ever downscale
  const ratio = maxW / srcW;
  const outW = maxW;
  const outH = Math.round(srcH * ratio);

  const canvas = createCanvas(outW, outH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, 0, 0, outW, outH);

  const mime = getFormatMime(format);
  const blob = await canvasToBlob(canvas, mime, quality);

  return {
    blob,
    width: outW,
    height: outH,
    timeMs: performance.now() - t0,
  };
}

/**
 * Create a canvas (OffscreenCanvas if available, regular fallback otherwise).
 */
function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (supportsOffscreenCanvas()) {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Convert a canvas to a Blob, handling both OffscreenCanvas and HTMLCanvasElement.
 */
function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  mime: string,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: mime, quality }) as Promise<Blob>;
  }

  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob returned null'));
      },
      mime,
      quality,
    );
  });
}

/**
 * Estimate the compressed output size using a pixels × bits-per-pixel heuristic.
 */
export function estimateCompressedSize(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  quality: number,
  format: OutputFormat,
): number {
  let outW = srcWidth;
  let outH = srcHeight;
  if (srcWidth > maxWidth) {
    const ratio = maxWidth / srcWidth;
    outW = maxWidth;
    outH = Math.round(srcHeight * ratio);
  }

  const pixels = outW * outH;

  // Approximate bits-per-pixel by format at 100 % quality
  const bppBase: Record<OutputFormat, number> = {
    jpeg: 0.5,
    webp: 0.35,
    png: 2.0,
  };

  const bpp = bppBase[format] * quality;
  return Math.round(pixels * bpp + 1024); // +1 KB metadata overhead
}

/**
 * Check whether an image exceeds the maximum-dimension threshold.
 */
export function exceedsDimensionLimit(meta: { originalWidth: number; originalHeight: number }): boolean {
  return meta.originalWidth > MAX_DIMENSION || meta.originalHeight > MAX_DIMENSION;
}