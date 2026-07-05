import { subscribe } from '../state';
import { stats } from '../state';
import { formatSize, formatDuration } from '../utils/format';

/**
 * Renders the statistics dashboard showing real-time metrics
 * about the current batch of images.
 */
export function renderStatsDashboard(container: HTMLElement): void {
  container.innerHTML = `
    <section class="stats-dashboard" aria-label="Processing statistics">
      <h2 class="section-heading">Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-card__label">Images in Queue</span>
          <span class="stat-card__value" id="stat-count">0</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Original Size</span>
          <span class="stat-card__value" id="stat-original">—</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Optimised Size</span>
          <span class="stat-card__value" id="stat-optimised">—</span>
        </div>
        <div class="stat-card stat-card--highlight">
          <span class="stat-card__label">Savings</span>
          <span class="stat-card__value" id="stat-savings">—</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Avg. Time / Image</span>
          <span class="stat-card__value" id="stat-time">—</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__label">Total Processing Time</span>
          <span class="stat-card__value" id="stat-total-time">—</span>
        </div>
      </div>
    </section>
  `;

  function update(): void {
    const s = stats;

    document.getElementById('stat-count')!.textContent = String(s.totalImages);
    document.getElementById('stat-original')!.textContent = s.originalTotalSize > 0 ? formatSize(s.originalTotalSize) : '—';
    document.getElementById('stat-optimised')!.textContent = s.optimisedTotalSize > 0 ? formatSize(s.optimisedTotalSize) : '—';

    // Percentage savings
    if (s.originalTotalSize > 0 && s.optimisedTotalSize > 0) {
      const savings = ((s.originalTotalSize - s.optimisedTotalSize) / s.originalTotalSize * 100);
      document.getElementById('stat-savings')!.textContent =
        savings > 0 ? `${savings.toFixed(1)}%` : '0%';
    } else {
      document.getElementById('stat-savings')!.textContent = '—';
    }

    // Average time per image
    if (s.totalTimeMs > 0 && s.totalImages > 0) {
      document.getElementById('stat-time')!.textContent =
        formatDuration(s.totalTimeMs / s.totalImages);
    } else {
      document.getElementById('stat-time')!.textContent = '—';
    }

    document.getElementById('stat-total-time')!.textContent =
      s.totalTimeMs > 0 ? formatDuration(s.totalTimeMs) : '—';
  }

  update();
  subscribe(update);
}