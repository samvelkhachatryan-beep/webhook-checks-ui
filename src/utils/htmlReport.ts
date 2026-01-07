import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { WebhookTestResult } from '../types/index.js';

/**
 * Generate HTML report for webhook test results
 */
export function generateHtmlReport(
  results: WebhookTestResult[],
  outputPath: string = './artifacts/webhook-results.html'
): void {
  const html = buildHtmlContent(results);

  // Ensure the directory exists
  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(outputPath, html, 'utf-8');
  console.log(`\n📄 HTML report generated: ${outputPath}`);
}

/**
 * Build the HTML content for the report
 */
function buildHtmlContent(results: WebhookTestResult[]): string {
  const timestamp = new Date().toISOString();
  const passedResults = results.filter((r) => r.success);
  const failedResults = results.filter((r) => !r.success);
  const successCount = passedResults.length;
  const failureCount = failedResults.length;

  // Build passed sections
  const passedSections = passedResults.map((result) => buildWebhookSection(result)).join('\n');

  // Group failed results by error type
  const errorGroups = groupByError(failedResults);
  const failedSections = buildErrorGroupedSections(errorGroups);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webhook Test Results</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"></noscript>
  <style>

    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a26;
      --bg-card: #14141e;
      --text-primary: #f0f0f5;
      --text-secondary: #8888a0;
      --accent-primary: #7c3aed;
      --accent-secondary: #06b6d4;
      --accent-gradient: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
      --success: #10b981;
      --error: #ef4444;
      --warning: #f59e0b;
      --border: rgba(255, 255, 255, 0.08);
      --glow-primary: rgba(124, 58, 237, 0.3);
      --glow-secondary: rgba(6, 182, 212, 0.3);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      background-image: 
        radial-gradient(ellipse at 20% 0%, var(--glow-primary) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, var(--glow-secondary) 0%, transparent 50%);
    }

    .container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      text-align: center;
      margin-bottom: 2rem;
      padding: 3rem 2rem;
      background: var(--bg-card);
      border-radius: 24px;
      border: 1px solid var(--border);
      backdrop-filter: blur(10px);
      position: relative;
      overflow: hidden;
    }

    header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent-gradient);
    }

    h1 {
      font-size: 3rem;
      font-weight: 700;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .timestamp {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
    }

    .summary {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    .summary-item {
      padding: 1rem 2rem;
      border-radius: 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      font-weight: 600;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .summary-item.success {
      border-color: var(--success);
      color: var(--success);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }

    .summary-item.failure {
      border-color: var(--error);
      color: var(--error);
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
    }

    .summary-item.total {
      border-color: var(--accent-primary);
      color: var(--text-primary);
    }

    /* Tab styles */
    .tabs-container {
      margin-bottom: 2rem;
    }

    .tab-buttons {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: var(--bg-card);
      padding: 0.5rem;
      border-radius: 16px;
      border: 1px solid var(--border);
      width: fit-content;
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 12px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-button:hover {
      color: var(--text-primary);
      background: var(--bg-tertiary);
    }

    .tab-button.active {
      background: var(--accent-gradient);
      color: white;
    }

    .tab-button.success-tab.active {
      background: var(--success);
    }

    .tab-button.failed-tab.active {
      background: var(--error);
    }

    .tab-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 0.15rem 0.5rem;
      border-radius: 8px;
      font-size: 0.85rem;
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    /* Error category styles */
    .error-category {
      margin-bottom: 2rem;
    }

    .error-category-header {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-left: 4px solid var(--error);
      border-radius: 12px;
      padding: 1rem 1.5rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      transition: background 0.2s;
    }

    .error-category-header:hover {
      background: var(--bg-tertiary);
    }

    .error-category-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--error);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .error-category-count {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
      padding: 0.25rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .error-category-items {
      display: none;
      padding-left: 1rem;
    }

    .error-category.expanded .error-category-items {
      display: block;
    }

    .error-category-header::after {
      content: '▶';
      font-size: 0.7rem;
      color: var(--text-secondary);
      transition: transform 0.2s;
    }

    .error-category.expanded .error-category-header::after {
      transform: rotate(90deg);
    }

    .webhook-section {
      margin-bottom: 1.5rem;
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .webhook-section:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
    }

    .webhook-header {
      padding: 1.25rem 1.5rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .webhook-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .webhook-slug {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .webhook-title {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 400;
    }

    .webhook-id {
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
      font-size: 0.75rem;
      color: var(--accent-secondary);
      opacity: 0.8;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .flow-type-badge {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .flow-type-badge.image {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-secondary);
      border: 1px solid rgba(6, 182, 212, 0.3);
    }

    .flow-type-badge.video {
      background: rgba(124, 58, 237, 0.15);
      color: var(--accent-primary);
      border: 1px solid rgba(124, 58, 237, 0.3);
    }

    .duration {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
    }

    .status-badge {
      padding: 0.35rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-badge.success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
      border: 1px solid var(--success);
    }

    .status-badge.failed {
      background: rgba(239, 68, 68, 0.15);
      color: var(--error);
      border: 1px solid var(--error);
    }

    .error-message {
      padding: 1.25rem 1.5rem;
      background: rgba(239, 68, 68, 0.08);
      color: var(--error);
      font-size: 0.9rem;
      border-left: 3px solid var(--error);
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
      padding: 1.5rem;
    }

    .result-card {
      background: var(--bg-tertiary);
      border-radius: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .result-card:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .media-preview {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      background: var(--bg-primary);
      overflow: hidden;
    }

    .preview-image,
    .preview-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .result-card:hover .preview-image,
    .result-card:hover .preview-video {
      transform: scale(1.05);
    }

    .preview-video {
      cursor: pointer;
    }

    .video-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 60px;
      height: 60px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
    }

    .video-overlay::after {
      content: '';
      border-style: solid;
      border-width: 10px 0 10px 18px;
      border-color: transparent transparent transparent white;
      margin-left: 4px;
    }

    .result-card:hover .video-overlay {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }

    .result-info {
      padding: 1rem;
    }

    .type-badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 0.5rem;
    }

    .type-badge.image {
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-secondary);
    }

    .type-badge.video {
      background: rgba(124, 58, 237, 0.15);
      color: var(--accent-primary);
    }

    .url-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.75rem;
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
      word-break: break-all;
      display: block;
      transition: color 0.2s;
    }

    .url-link:hover {
      color: var(--accent-secondary);
    }

    .metadata {
      color: var(--text-secondary);
      font-size: 0.7rem;
      margin-top: 0.5rem;
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
      opacity: 0.8;
    }

    .no-results {
      padding: 3rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .logs-section {
      border-top: 1px solid var(--border);
      background: var(--bg-primary);
    }

    .logs-header {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      font-size: 0.85rem;
      user-select: none;
      transition: background 0.2s, color 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logs-header:hover {
      background: var(--bg-tertiary);
      color: var(--text-primary);
    }

    .logs-header::before {
      content: '▶';
      font-size: 0.6rem;
      transition: transform 0.2s;
    }

    .logs-section.expanded .logs-header::before {
      transform: rotate(90deg);
    }

    .logs-content {
      display: none;
      padding: 1rem 1.5rem;
      margin: 0;
      font-size: 0.75rem;
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
      color: var(--text-secondary);
      background: var(--bg-tertiary);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 400px;
      overflow-y: auto;
    }

    .logs-section.expanded .logs-content {
      display: block;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state-text {
      font-size: 1.2rem;
    }

    footer {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    footer a {
      color: var(--accent-secondary);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      .webhook-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .results-grid {
        grid-template-columns: 1fr;
      }

      .tab-buttons {
        width: 100%;
      }

      .tab-button {
        flex: 1;
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎨 Magic Flow Results</h1>
      <p class="timestamp">Generated: ${timestamp}</p>
      <div class="summary">
        <div class="summary-item success">✓ ${successCount} Passed</div>
        <div class="summary-item failure">✗ ${failureCount} Failed</div>
        <div class="summary-item total">📊 ${results.length} Total</div>
      </div>
    </header>

    <div class="tabs-container">
      <div class="tab-buttons">
        <button class="tab-button success-tab active" data-tab="passed">
          ✓ Passed <span class="tab-count">${successCount}</span>
        </button>
        <button class="tab-button failed-tab" data-tab="failed">
          ✗ Failed <span class="tab-count">${failureCount}</span>
        </button>
      </div>

      <div id="passed" class="tab-content active">
        ${passedSections || '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-text">No passed tests yet</div></div>'}
      </div>

      <div id="failed" class="tab-content">
        ${failedSections || '<div class="empty-state"><div class="empty-state-icon">✨</div><div class="empty-state-text">No failed tests!</div></div>'}
      </div>
    </div>

    <footer>
      <p>Picsart Magic Flow Webhook Automation Tests</p>
    </footer>
  </div>

  <script>
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', function() {
        const tabId = this.dataset.tab;
        
        // Update buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
      });
    });

    // Error category toggle
    document.querySelectorAll('.error-category-header').forEach(header => {
      header.addEventListener('click', function() {
        this.parentElement.classList.toggle('expanded');
      });
    });

    // Play video on hover
    document.querySelectorAll('.preview-video').forEach(video => {
      video.addEventListener('mouseenter', function() {
        this.play().catch(() => {});
      });
      video.addEventListener('mouseleave', function() {
        this.pause();
        this.currentTime = 0;
      });
    });

    // Toggle logs
    document.querySelectorAll('.logs-header').forEach(header => {
      header.addEventListener('click', function() {
        this.parentElement.classList.toggle('expanded');
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Group failed results by error message
 */
function groupByError(failedResults: WebhookTestResult[]): Map<string, WebhookTestResult[]> {
  const groups = new Map<string, WebhookTestResult[]>();
  
  for (const result of failedResults) {
    const errorKey = normalizeError(result.error || 'Unknown error');
    if (!groups.has(errorKey)) {
      groups.set(errorKey, []);
    }
    groups.get(errorKey)!.push(result);
  }
  
  // Sort by count (most common errors first)
  return new Map([...groups.entries()].sort((a, b) => b[1].length - a[1].length));
}

/**
 * Normalize error messages to group similar errors together
 */
function normalizeError(error: string): string {
  // Remove specific IDs/UUIDs to group similar errors
  let normalized = error
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[ID]')
    .replace(/[0-9a-f]{24}/gi, '[ID]')
    .replace(/\d{13,}/g, '[TIMESTAMP]');
  
  // Truncate very long errors
  if (normalized.length > 100) {
    normalized = normalized.substring(0, 100) + '...';
  }
  
  return normalized;
}

/**
 * Build HTML sections grouped by error type
 */
function buildErrorGroupedSections(errorGroups: Map<string, WebhookTestResult[]>): string {
  if (errorGroups.size === 0) {
    return '';
  }
  
  let html = '';
  
  for (const [errorType, results] of errorGroups) {
    const webhookSections = results.map((result) => buildWebhookSection(result)).join('\n');
    
    html += `
      <div class="error-category expanded">
        <div class="error-category-header">
          <span class="error-category-title">
            ⚠️ ${escapeHtml(errorType)}
          </span>
          <span class="error-category-count">${results.length} webhook${results.length > 1 ? 's' : ''}</span>
        </div>
        <div class="error-category-items">
          ${webhookSections}
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number | undefined): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Build HTML section for a single webhook result
 */
function buildWebhookSection(result: WebhookTestResult): string {
  const statusClass = result.success ? 'success' : 'failed';
  const statusText = result.success ? 'Passed' : 'Failed';
  const duration = formatDuration(result.durationMs);
  const flowTypeClass = result.flowType || 'image';

  // Build slug/title display
  const slugDisplay = result.slug || result.webhookId;
  const titleDisplay = result.title || '';

  let content: string;

  if (result.error) {
    content = `<div class="error-message">❌ ${escapeHtml(result.error)}</div>`;
  } else if (result.results.length === 0) {
    content = `<div class="no-results">No IMAGE or VIDEO results found</div>`;
  } else {
    const cards = result.results
      .map((item) => {
        const isVideo = item.type.toLowerCase() === 'video';
        const mediaPreview = isVideo
          ? `
            <video class="preview-video" muted loop playsinline preload="metadata">
              <source src="${escapeHtml(item.url)}" type="video/mp4">
              Your browser does not support video.
            </video>
            <div class="video-overlay"></div>
          `
          : `<img src="${escapeHtml(item.url)}" alt="Preview" class="preview-image" loading="lazy" />`;

        const metadataHtml = item.metadata
          ? `<div class="metadata">${item.metadata.width}×${item.metadata.height} • ${item.metadata.mimeType || 'unknown'}${item.metadata.duration ? ` • ${item.metadata.duration}s` : ''}</div>`
          : '';

        return `
          <div class="result-card">
            <div class="media-preview">
              ${mediaPreview}
            </div>
            <div class="result-info">
              <span class="type-badge ${item.type.toLowerCase()}">${escapeHtml(item.type)}</span>
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="url-link">
                ${truncateUrl(item.url)}
              </a>
              ${metadataHtml}
            </div>
          </div>
        `;
      })
      .join('\n');

    content = `<div class="results-grid">${cards}</div>`;
  }

  // Add logs section for failed tests
  let logsSection = '';
  if (!result.success && result.logs && result.logs.length > 0) {
    const logsHtml = result.logs.map((l) => escapeHtml(l)).join('\n');
    logsSection = `
      <div class="logs-section">
        <div class="logs-header">Execution Logs</div>
        <pre class="logs-content">${logsHtml}</pre>
      </div>`;
  }

  return `
    <section class="webhook-section">
      <div class="webhook-header">
        <div class="webhook-info">
          <span class="webhook-slug">${escapeHtml(slugDisplay)}</span>
          ${titleDisplay ? `<span class="webhook-title">${escapeHtml(titleDisplay)}</span>` : ''}
          <span class="webhook-id">${escapeHtml(result.webhookId)}</span>
        </div>
        <div class="header-right">
          <span class="flow-type-badge ${flowTypeClass}">${flowTypeClass}</span>
          <span class="duration">⏱ ${duration}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
      ${content}
      ${logsSection}
    </section>`;
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate dated HTML report and update index
 */
export function generateDatedReport(results: WebhookTestResult[], artifactsDir: string = './artifacts'): string {
  // Create artifacts directory if it doesn't exist
  if (!existsSync(artifactsDir)) {
    mkdirSync(artifactsDir, { recursive: true });
  }

  // Generate filename with date and time
  const now = new Date();
  const filename = `test-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.html`;
  const filepath = join(artifactsDir, filename);

  // Generate and save the report
  const html = buildHtmlContent(results);
  writeFileSync(filepath, html, 'utf-8');
  console.log(`\n📄 HTML report generated: ${filepath}`);

  // Update index.html
  updateIndexPage(artifactsDir);

  return filepath;
}

/**
 * Update or create index.html with links to all test reports
 */
function updateIndexPage(artifactsDir: string): void {
  const indexPath = join(artifactsDir, 'index.html');

  // Get all test report files
  const files = readdirSync(artifactsDir)
    .filter(f => f.startsWith('test-') && f.endsWith('.html'))
    .map(filename => {
      const filepath = join(artifactsDir, filename);
      const stats = statSync(filepath);
      return {
        filename,
        created: stats.birthtime,
        size: stats.size
      };
    })
    .sort((a, b) => b.created.getTime() - a.created.getTime()); // Most recent first

  const indexHtml = buildIndexContent(files);
  writeFileSync(indexPath, indexHtml, 'utf-8');
  console.log(`📋 Index page updated: ${indexPath}`);
}

/**
 * Build the HTML content for the index page
 */
function buildIndexContent(files: Array<{ filename: string; created: Date; size: number }>): string {
  const fileRows = files.map(file => {
    const dateStr = file.created.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const sizeKB = (file.size / 1024).toFixed(1);
    
    return `
      <tr>
        <td><a href="${escapeHtml(file.filename)}" class="report-link">${escapeHtml(file.filename)}</a></td>
        <td>${dateStr}</td>
        <td>${sizeKB} KB</td>
        <td>
          <a href="${escapeHtml(file.filename)}" class="view-btn" target="_blank">View</a>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webhook Test History</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet"></noscript>
  <style>

    :root {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a26;
      --bg-card: #14141e;
      --text-primary: #f0f0f5;
      --text-secondary: #8888a0;
      --accent-primary: #7c3aed;
      --accent-secondary: #06b6d4;
      --accent-gradient: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
      --success: #10b981;
      --border: rgba(255, 255, 255, 0.08);
      --glow-primary: rgba(124, 58, 237, 0.3);
      --glow-secondary: rgba(6, 182, 212, 0.3);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      padding: 2rem;
      background-image: 
        radial-gradient(ellipse at 20% 0%, var(--glow-primary) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, var(--glow-secondary) 0%, transparent 50%);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 3rem 2rem;
      background: var(--bg-card);
      border-radius: 24px;
      border: 1px solid var(--border);
      position: relative;
      overflow: hidden;
    }

    header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--accent-gradient);
    }

    h1 {
      font-size: 3rem;
      font-weight: 700;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      margin-top: 1rem;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 2rem;
      flex-wrap: wrap;
    }

    .stat-box {
      padding: 1rem 2rem;
      background: var(--bg-tertiary);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .content-card {
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border);
      overflow: hidden;
    }

    .card-header {
      padding: 1.5rem 2rem;
      background: var(--bg-tertiary);
      border-bottom: 1px solid var(--border);
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: var(--bg-secondary);
      padding: 1rem 2rem;
      text-align: left;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 1.25rem 2rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-primary);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: var(--bg-tertiary);
    }

    .report-link {
      color: var(--accent-secondary);
      text-decoration: none;
      font-family: 'IBM Plex Mono', 'Courier New', Consolas, monospace;
      font-size: 0.9rem;
      transition: color 0.2s;
    }

    .report-link:hover {
      color: var(--accent-primary);
      text-decoration: underline;
    }

    .view-btn {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: var(--accent-gradient);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .view-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
    }

    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    footer {
      text-align: center;
      padding: 3rem 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 3rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }

      table {
        font-size: 0.85rem;
      }

      th, td {
        padding: 0.75rem 1rem;
      }

      .stat-value {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Test History</h1>
      <p class="subtitle">Magic Flow Webhook Test Results</p>
      <div class="stats">
        <div class="stat-box">
          <div class="stat-label">Total Reports</div>
          <div class="stat-value">${files.length}</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">Last Updated</div>
          <div class="stat-value">${files.length > 0 ? new Date().toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>
    </header>

    <div class="content-card">
      <div class="card-header">
        <h2>Test Reports</h2>
      </div>
      ${files.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Date & Time</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${fileRows}
          </tbody>
        </table>
      ` : `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No test reports yet. Run some tests to see results here!</p>
        </div>
      `}
    </div>

    <footer>
      <p>Picsart Magic Flow Webhook Automation Tests</p>
    </footer>
  </div>

  <script>
    // Removed auto-refresh to prevent reload loops
    // Manual refresh: Press F5 or Cmd+R to see latest reports
  </script>
</body>
</html>`;
}

/**
 * Log summary to console in JSON format
 */
export function logSummary(results: WebhookTestResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 WEBHOOK TEST SUMMARY');
  console.log('='.repeat(60));

  const summary: Record<string, { slug?: string; urls: string[] }> = {};

  for (const result of results) {
    if (result.success) {
      summary[result.webhookId] = {
        slug: result.slug,
        urls: result.results.map((r) => r.url),
      };
    } else {
      summary[result.webhookId] = {
        slug: result.slug,
        urls: [`ERROR: ${result.error}`],
      };
    }
  }

  console.log(JSON.stringify(summary, null, 2));
  console.log('='.repeat(60) + '\n');
}
