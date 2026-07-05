import { subscribe } from '../state';
import { imageQueue, removeFromQueue } from '../state';
import { formatSize } from '../utils/format';

/**
 * Renders the image queue panel showing thumbnails and metadata
 * for uploaded images awaiting processing.
 */
export function renderImageQueue(container: HTMLElement): void {
  // Build initial DOM structure
  container.innerHTML = `
    <section class="image-queue" aria-label="Image queue">
      <h2 class="section-heading">
        Uploaded Images
        <span class="queue-count" id="queue-count">0</span>
      </h2>
      <div class="queue-grid" id="queue-grid" role="list"></div>
      <div class="queue-empty" id="queue-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
        <p>No images yet. Drag & drop or click browse to get started.</p>
      </div>
    </section>
  `;

  const grid = document.getElementById('queue-grid')!;
  const empty = document.getElementById('queue-empty')!;
  const count = document.getElementById('queue-count')!;

  /** Rebuild the grid whenever state changes */
  function update(): void {
    count.textContent = String(imageQueue.length);

    if (imageQueue.length === 0) {
      empty.style.display = 'flex';
      grid.innerHTML = '';
      return;
    }

    empty.style.display = 'none';

    grid.innerHTML = imageQueue
      .map(
        (img) => `
      <div class="queue-card" role="listitem" data-id="${img.id}">
        <button class="queue-card__remove" data-action="remove" data-id="${img.id}" aria-label="Remove ${img.metadata.filename}" title="Remove">
          &times;
        </button>
        <img class="queue-card__thumb" src="${img.thumbnail}" alt="${img.metadata.filename}" loading="lazy" />
        <div class="queue-card__info">
          <span class="queue-card__name" title="${img.metadata.filename}">${img.metadata.filename}</span>
          <span class="queue-card__meta">
            ${img.metadata.originalWidth}&times;${img.metadata.originalHeight}
            &middot; ${formatSize(img.metadata.originalSize)}
          </span>
        </div>
      </div>
    `,
      )
      .join('');

    // Attach remove handlers
    grid.querySelectorAll<HTMLButtonElement>('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (id) removeFromQueue(id);
      });
    });
  }

  // Initial render + subscribe
  update();
  subscribe(update);
}