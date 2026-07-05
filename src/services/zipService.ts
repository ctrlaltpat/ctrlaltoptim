import JSZip from 'jszip';
import type { ProcessedImage } from '../types';
import { baseFilename } from '../utils/format';
import { FORMAT_EXT } from '../constants';

/**
 * Bundle an array of processed images into a single ZIP archive
 * and trigger a browser download.
 *
 * The internal ZIP structure:
 *   image-optimiser-export/
 *     image-name-large.webp
 *     image-name-medium.webp
 *     image-name-small.webp
 *     image-name-original.webp
 */
export async function downloadAllAsZip(images: ProcessedImage[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('image-optimiser-export')!;

  for (const img of images) {
    // Find the source filename – we do not store it directly so we
    // parse it from the ProcessedImage which should carry it.
    // We'll rely on the caller passing a map if needed, but for now
    // construct a name from id + variant.
    const safeName = sanitizeFilename(`${img.variant.replace(/\s+/g, '-').toLowerCase()}`);
    const ext = FORMAT_EXT[img.format];
    const filename = `${safeName}${ext}`;

    root.file(filename, img.blob, { binary: true });
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  triggerDownload(archive, 'image-optimiser-export.zip');
}

/**
 * Generate a ZIP that uses source filenames and variant labels
 * to produce a clean, human-readable archive structure.
 */
export async function downloadAllAsZipNamed(
  images: ProcessedImage[],
  getName: (img: ProcessedImage) => string,
): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder('image-optimiser-export')!;

  for (const img of images) {
    const base = baseFilename(getName(img));
    const safe = sanitizeFilename(base);
    const ext = FORMAT_EXT[img.format];
    const variant = img.variant.replace(/\s*\(.*?\)\s*/, '').replace(/\s+/g, '-').toLowerCase();
    root.file(`${safe}-${variant}${ext}`, img.blob, { binary: true });
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  triggerDownload(archive, 'image-optimiser-export.zip');
}

/**
 * Estimate the final ZIP size based on individual blob sizes.
 * ZIP adds roughly ~1-2 % overhead for metadata.
 */
export function estimateZipSize(images: ProcessedImage[]): number {
  const raw = images.reduce((sum, img) => sum + img.size, 0);
  return Math.round(raw * 1.015); // ~1.5 % overhead estimate
}

/** Replace characters unsafe for file names */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

/** Create a temporary anchor and click it to download a Blob */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}