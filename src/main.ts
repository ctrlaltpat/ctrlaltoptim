import './style.css';
import { renderUploadZone } from './components/uploadZone';
import { renderSettings } from './components/settings';
import { renderImageQueue } from './components/imageQueue';
import { renderOutputGallery } from './components/outputGallery';
import { renderStatsDashboard } from './components/statsDashboard';
import { processImage, supportsOffscreenCanvas } from './services/imageProcessor';
import {
  imageQueue,
  settings,
  processedImages,
  setProcessedImages,
  recomputeStats,
  resetProcessedImages,
  clearQueue,
  stats,
  subscribe,
} from './state';
import { formatSize } from './utils/format';

/* ------------------------------------------------------------------ */
/*  Bootstrap the application                                          */
/* ------------------------------------------------------------------ */

function init(): void {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <header class="app-header">
      <h1 class="app-title">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
        Image Optimiser
      </h1>
      <p class="app-subtitle">Compress, resize, and download optimised images – all in your browser</p>
    </header>

    <main class="app-main">
      <div id="upload-section"></div>

      <div class="app-layout">
        <aside id="sidebar">
          <div id="settings-section"></div>
          <div id="queue-section"></div>
        </aside>

        <div id="content">
          <div class="process-bar" id="process-bar">
            <button class="btn btn--process" id="btn-process" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
              </svg>
              Optimise Images
            </button>
            <button class="btn btn--ghost" id="btn-clear" disabled>
              Clear All
            </button>
            <div class="process-status" id="process-status" aria-live="polite"></div>
          </div>
          <div id="output-section"></div>
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <div id="stats-section"></div>
    </footer>
  `;

  // Render all sub-components
  renderUploadZone(document.getElementById('upload-section')!);
  renderSettings(document.getElementById('settings-section')!);
  renderImageQueue(document.getElementById('queue-section')!);
  renderOutputGallery(document.getElementById('output-section')!);
  renderStatsDashboard(document.getElementById('stats-section')!);

  // Wire the process button
  const btnProcess = document.getElementById('btn-process') as HTMLButtonElement;
  const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
  const status = document.getElementById('process-status')!;

  subscribe(() => {
    const hasImages = imageQueue.length > 0;
    const hasTargets = settings.resizeTargets.some((t) => t.enabled) || settings.includeOriginalSize;
    btnProcess.disabled = !hasImages || !hasTargets;
    btnClear.disabled = !hasImages && processedImages.length === 0;
  });

  btnProcess.addEventListener('click', () => runPipeline(status));

  btnClear.addEventListener('click', () => {
    clearQueue();
    status.textContent = '';
  });

  // Check browser compatibility
  if (!supportsOffscreenCanvas()) {
    console.warn('OffscreenCanvas not available – falling back to regular canvas.');
  }
}

/* ------------------------------------------------------------------ */
/*  Processing pipeline                                                */
/* ------------------------------------------------------------------ */

async function runPipeline(statusEl: HTMLElement): Promise<void> {
  const queue = [...imageQueue];
  if (queue.length === 0) return;

  // Always start fresh — avoid accumulating results from prior runs
  resetProcessedImages();

  const startTime = performance.now();
  let completed = 0;
  const total = queue.length;

  statusEl.textContent = `Processing 0 / ${total}…`;
  statusEl.className = 'process-status process-status--active';

  let hadError = false;

  for (const source of queue) {
    try {
      const results = await processImage(
        source,
        settings.resizeTargets,
        settings.outputFormat,
        settings.quality,
        settings.includeOriginalSize,
      );
      setProcessedImages(results);
    } catch (err) {
      console.error(`Failed to process "${source.metadata.filename}":`, err);
      hadError = true;
    }

    completed++;
    statusEl.textContent = `Processing ${completed} / ${total}…`;
  }

  const elapsed = performance.now() - startTime;
  recomputeStats();

  statusEl.className = hadError
    ? 'process-status process-status--warning'
    : 'process-status process-status--done';

  const totalOutputSize = stats.optimisedTotalSize;
  statusEl.innerHTML = `
    Done! Processed ${total} image${total !== 1 ? 's' : ''}
    in ${(elapsed / 1000).toFixed(1)}s.
    Output: ${formatSize(totalOutputSize)} total
    ${hadError ? '<br/><small>Some images failed – check console for details.</small>' : ''}
  `;
}

// Boot
document.addEventListener('DOMContentLoaded', init);