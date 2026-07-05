import type { ImageFile, SupportedMimeType } from '../types';
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE, MAX_DIMENSION } from '../constants';
import { enqueueImages } from '../state';


/**
 * Renders the upload zone with drag-and-drop and file-picker support.
 * Validates files and generates thumbnail previews before enqueuing.
 */
export function renderUploadZone(container: HTMLElement): void {
  container.innerHTML = `
    <section class="upload-zone-wrapper" aria-label="Image upload">
      <div class="upload-zone" id="upload-zone" role="button" tabindex="0" aria-label="Drop images here or click to browse">
        <div class="upload-zone__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17,8 12,3 7,8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <p class="upload-zone__title">Drag & drop images here</p>
        <p class="upload-zone__subtitle">or</p>
        <button class="btn btn--primary" id="btn-browse" type="button">
          Browse Files
        </button>
        <p class="upload-zone__hint">Supports JPEG, PNG, WebP, AVIF</p>
      </div>
      <input
        type="file"
        id="file-input"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        hidden
        aria-hidden="true"
      />
    </section>
  `;

  const zone = document.getElementById('upload-zone')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const browseBtn = document.getElementById('btn-browse')!;

  // ----- File picker -----
  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  zone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFiles(Array.from(fileInput.files));
      fileInput.value = ''; // allow re-upload of same file
    }
  });

  // ----- Drag & drop -----
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('upload-zone--drag-over');
  });

  zone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    zone.classList.remove('upload-zone--drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('upload-zone--drag-over');
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Also support global drop events (in case user misses the zone)
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    // Only handle if not already handled by the zone
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0 && !zone.contains(e.target as Node)) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Keyboard: Enter / Space on the upload zone triggers browse
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
}

/* ------------------------------------------------------------------ */
/*  File handling                                                      */
/* ------------------------------------------------------------------ */

/**
 * Validate, generate thumbnails, and enqueue selected files.
 */
async function handleFiles(files: File[]): Promise<void> {
  const accepted: ImageFile[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    // --- type check ---
    if (!SUPPORTED_MIME_TYPES.includes(file.type as SupportedMimeType)) {
      warnings.push(`"${file.name}" is not a supported image type.`);
      continue;
    }

    // --- size check ---
    if (file.size > MAX_FILE_SIZE) {
      warnings.push(`"${file.name}" is larger than 20 MB – processing may be slow.`);
    }

    // --- decode to get dimensions ---
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = bitmap;
      bitmap.close();

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        warnings.push(`"${file.name}" exceeds 16 000 px in one dimension.`);
      }

      // Generate a small thumbnail
      const thumbDataUrl = await generateThumbnail(file, width, height);

      accepted.push({
        id: crypto.randomUUID(),
        file,
        thumbnail: thumbDataUrl,
        metadata: {
          filename: file.name,
          originalWidth: width,
          originalHeight: height,
          originalSize: file.size,
          mimeType: file.type as SupportedMimeType,
        },
      });
    } catch {
      warnings.push(`"${file.name}" could not be read as an image.`);
    }
  }

  if (accepted.length > 0) {
    enqueueImages(accepted);
  }

  if (warnings.length > 0) {
    showToast(warnings.join('\n'), 'warning');
  }
}

/**
 * Generate a small preview thumbnail (max 200px) for the queue card.
 */
async function generateThumbnail(file: File, srcW: number, srcH: number): Promise<string> {
  const maxThumb = 200;
  let tw = srcW;
  let th = srcH;
  if (tw > maxThumb || th > maxThumb) {
    const ratio = Math.min(maxThumb / tw, maxThumb / th);
    tw = Math.round(tw * ratio);
    th = Math.round(th * ratio);
  }

  const bitmap = await createImageBitmap(file, {
    resizeWidth: tw,
    resizeHeight: th,
    resizeQuality: 'high',
  });

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(bitmap, 0, 0, tw, th);
  }
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Display a temporary toast / notification at the top of the page.
 */
function showToast(message: string, type: 'warning' | 'error'): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  document.body.appendChild(toast);

  // Animate in, then out
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}