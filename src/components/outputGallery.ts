import { subscribe } from '../state';
import { processedImages, imageQueue } from '../state';
import { formatSize, formatDuration, baseFilename } from '../utils/format';
import { downloadAllAsZipNamed, estimateZipSize } from '../services/zipService';

/**
 * Renders the output gallery showing processed images with
 * individual download buttons and a "Download All as ZIP" action.
 */
export function renderOutputGallery(container: HTMLElement): void {
  container.innerHTML = `
    <section class="output-gallery" aria-label="Processing results">
      <h2 class="section-heading">Results</h2>
      <div class="output-actions" id="output-actions" style="display:none">
        <button class="btn btn--primary" id="btn-download-zip" disabled>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download All as ZIP
        </button>
        <span class="zip-estimate" id="zip-estimate"></span>
      </div>
      <div class="output-grid" id="output-grid"></div>
      <div class="output-empty" id="output-empty">
        <p>Processed images will appear here.</p>
      </div>
    </section>
  `;

  const actions = document.getElementById('output-actions')!;
  const grid = document.getElementById('output-grid')!;
  const empty = document.getElementById('output-empty')!;
  const zipBtn = document.getElementById('btn-download-zip') as HTMLButtonElement;
  const zipEstimate = document.getElementById('zip-estimate')!;

  // Build a mapping from processed sourceId → original filename
  function sourceNameMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const img of imageQueue) {
      map.set(img.id, img.metadata.filename);
    }
    return map;
  }

  function update(): void {
    if (processedImages.length === 0) {
      actions.style.display = 'none';
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    actions.style.display = 'flex';
    empty.style.display = 'none';

    const nameMap = sourceNameMap();
    const zipSize = estimateZipSize(processedImages);
    zipEstimate.textContent = `Estimated ZIP: ${formatSize(zipSize)}`;
    zipBtn.disabled = false;

    grid.innerHTML = processedImages
      .map(
        (img) => {
          return `
          <div class="output-card" data-id="${img.id}">
            <div class="output-card__header">
              <span class="output-card__variant">${img.variant}</span>
              <span class="output-card__dims">${img.width}&times;${img.height}</span>
            </div>
            <div class="output-card__details">
              <span class="output-card__format">${img.format.toUpperCase()}</span>
              <span class="output-card__size">${formatSize(img.size)}</span>
              <span class="output-card__time">${formatDuration(img.timeMs)}</span>
            </div>
            <button class="btn btn--small" data-download="${img.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
          </div>
        `;
        },
      )
      .join('');

    // Wire individual download buttons
    grid.querySelectorAll<HTMLButtonElement>('[data-download]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.download!;
        const img = processedImages.find((p) => p.id === id);
        if (!img) return;
        const url = URL.createObjectURL(img.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseFilename(nameMap.get(img.sourceId) ?? 'image')}-${img.variant.replace(/\s+/g, '-').toLowerCase()}.${img.format === 'jpeg' ? 'jpg' : img.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  }

  // ZIP download
  zipBtn.addEventListener('click', async () => {
    if (processedImages.length === 0) return;
    zipBtn.disabled = true;
    zipBtn.textContent = 'Generating ZIP…';
    try {
      const nameMap = sourceNameMap();
      await downloadAllAsZipNamed(processedImages, (img) => nameMap.get(img.sourceId) ?? 'image');
    } catch (err) {
      console.error('ZIP generation failed:', err);
      zipBtn.textContent = 'Error – try again';
      zipBtn.disabled = false;
      return;
    }
    zipBtn.textContent = 'Download All as ZIP';
    zipBtn.disabled = false;
  });

  update();
  subscribe(update);
}