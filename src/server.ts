import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { fetchCmsSchema, buildParamsFromSchema, submitMagicFlowWebhook, pollJobResult, isMediaResult, fetchAllFlowLandings } from './api/client.js';
import { MediaRecord, FlowLandingItem, WebhookTestResult } from './types/index.js';
import { generateDatedReport } from './utils/htmlReport.js';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 3000;

// Load environment variables
import '../tests/setup.js';

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webhook Tester</title>
  <style>
    :root {
      --bg-primary: #0a0a0a;
      --bg-secondary: #141414;
      --bg-tertiary: #1e1e1e;
      --text-primary: #f0f0f0;
      --text-secondary: #888;
      --accent: #00d4ff;
      --accent-hover: #00b8e6;
      --success: #00ff88;
      --error: #ff4466;
      --border: #2a2a2a;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 2rem;
      background: linear-gradient(90deg, var(--accent), #ff00aa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .input-section {
      background: var(--bg-secondary);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    .input-group {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    input[type="text"] {
      flex: 1;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      font-family: inherit;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      outline: none;
      transition: border-color 0.2s;
    }

    input[type="text"]:focus {
      border-color: var(--accent);
    }

    input[type="text"]::placeholder {
      color: var(--text-secondary);
    }

    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-family: inherit;
      font-weight: 600;
      background: var(--accent);
      color: var(--bg-primary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }

    button:hover {
      background: var(--accent-hover);
    }

    button:active {
      transform: scale(0.98);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .status {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      display: none;
    }

    .status.visible {
      display: block;
    }

    .status.loading {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid var(--accent);
      color: var(--accent);
    }

    .status.success {
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid var(--success);
      color: var(--success);
    }

    .status.error {
      background: rgba(255, 68, 102, 0.1);
      border: 1px solid var(--error);
      color: var(--error);
    }

    .results-section {
      background: var(--bg-secondary);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    h2 {
      font-size: 1.25rem;
      margin-bottom: 1.5rem;
      color: var(--text-secondary);
    }

    .result-card {
      background: var(--bg-tertiary);
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 1rem;
      overflow: hidden;
    }

    .result-header {
      padding: 1rem;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .webhook-id {
      font-weight: 600;
      color: var(--accent);
    }

    .result-content {
      padding: 1rem;
    }

    .media-item {
      margin-bottom: 1rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 8px;
    }

    .media-item:last-child {
      margin-bottom: 0;
    }

    .media-type {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: rgba(0, 212, 255, 0.15);
      color: var(--accent);
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .media-url {
      font-size: 0.875rem;
      color: var(--accent);
      word-break: break-all;
      text-decoration: none;
    }

    .media-url:hover {
      text-decoration: underline;
    }

    .media-preview {
      margin-top: 1rem;
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .media-preview img {
      max-width: 400px;
      max-height: 300px;
      border-radius: 8px;
    }

    .no-results {
      color: var(--text-secondary);
      text-align: center;
      padding: 2rem;
    }

    .logs {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--bg-primary);
      border-radius: 8px;
      font-size: 0.75rem;
      color: var(--text-secondary);
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Webhook Tester</h1>
    
    <div class="input-section">
      <div class="input-group">
        <input type="text" id="webhookId" placeholder="Enter Webhook ID (e.g., 692a03a33a9bdf800122416a)" />
        <button id="testBtn" onclick="testWebhook()">Test Webhook</button>
      </div>
      <div id="status" class="status"></div>
      <div id="logs" class="logs" style="display: none;"></div>
    </div>

    <div class="results-section">
      <h2>Results</h2>
      <div id="results">
        <div class="no-results">Enter a webhook ID and click "Test Webhook" to see results</div>
      </div>
    </div>
  </div>

  <script>
    let logs = [];

    function log(msg) {
      logs.push(msg);
      const logsEl = document.getElementById('logs');
      logsEl.textContent = logs.join('\\n');
      logsEl.scrollTop = logsEl.scrollHeight;
    }

    function setStatus(type, message) {
      const status = document.getElementById('status');
      status.className = 'status visible ' + type;
      status.textContent = message;
    }

    async function testWebhook() {
      const webhookId = document.getElementById('webhookId').value.trim();
      if (!webhookId) {
        setStatus('error', 'Please enter a webhook ID');
        return;
      }

      const btn = document.getElementById('testBtn');
      btn.disabled = true;
      logs = [];
      document.getElementById('logs').style.display = 'block';

      try {
        setStatus('loading', 'Testing webhook...');
        log('Starting test for webhook: ' + webhookId);

        const response = await fetch('/api/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ webhookId })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success', 'Test completed successfully!');
          displayResults(webhookId, data.results, data.logs);
        } else {
          setStatus('error', 'Test failed: ' + data.error);
          log('Error: ' + data.error);
        }
      } catch (err) {
        setStatus('error', 'Error: ' + err.message);
        log('Error: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    }

    function displayResults(webhookId, results, serverLogs) {
      serverLogs.forEach(l => log(l));

      const resultsEl = document.getElementById('results');
      
      let html = '<div class="result-card">';
      html += '<div class="result-header"><span class="webhook-id">' + webhookId + '</span></div>';
      html += '<div class="result-content">';

      if (results && results.length > 0) {
        results.forEach(item => {
          html += '<div class="media-item">';
          html += '<div class="media-type">' + item.type + '</div>';
          html += '<a href="' + item.url + '" target="_blank" class="media-url">' + item.url + '</a>';
          if (item.type === 'image') {
            html += '<div class="media-preview"><img src="' + item.url + '" alt="Result" /></div>';
          }
          html += '</div>';
        });
      } else {
        html += '<div class="no-results">No media results returned</div>';
      }

      html += '</div></div>';
      resultsEl.innerHTML = html;
    }
  </script>
</body>
</html>`;

/**
 * Serve static HTML page
 */
function serveHtml(res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(HTML_PAGE);
}

/**
 * Handle API test request
 */
async function handleTestRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body = '';

  for await (const chunk of req) {
    body += chunk;
  }

  const { webhookId } = JSON.parse(body);
  const logs: string[] = [];

  try {
    logs.push('Fetching CMS schema...');
    const schemaResponse = await fetchCmsSchema(webhookId);
    logs.push('Schema fetched: ' + schemaResponse.data.length + ' items');
    logs.push('Schema: ' + JSON.stringify(schemaResponse.data));

    const params = buildParamsFromSchema(schemaResponse.data);
    logs.push('Built params: ' + JSON.stringify(params));

    logs.push('Submitting webhook...');
    const submitResponse = await submitMagicFlowWebhook(webhookId, params);
    const jobId = submitResponse.response.id;
    logs.push('Job submitted: ' + jobId);

    logs.push('Polling for results...');
    const jobResult = await pollJobResult(jobId);
    logs.push('Job completed with ' + (jobResult.response.result?.length || 0) + ' results');

    const results: Array<{ type: string; url: string }> = [];

    if (jobResult.response.result) {
      for (const item of jobResult.response.result) {
        if (isMediaResult(item)) {
          const mediaData = item.result as MediaRecord;
          results.push({
            type: item.type,
            url: mediaData.url,
          });
          logs.push('Result: ' + item.type + ' - ' + mediaData.url);
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, results, logs }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push('Error: ' + errorMsg);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: errorMsg, logs }));
  }
}

/**
 * Handle test-all request with SSE streaming
 * Accepts optional webhookIds in request body for manual testing
 */
async function handleTestAllRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  function sendEvent(data: any) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  try {
    // Read request body for optional webhook IDs
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    let specificWebhookIds: string[] | null = null;
    if (body) {
      try {
        const parsed = JSON.parse(body);
        specificWebhookIds = parsed.webhookIds || null;
      } catch (e) {
        // Ignore parse errors, treat as no specific IDs
      }
    }

    // Fetch all webhooks or use specific IDs
    sendEvent({ type: 'init', message: 'Fetching webhooks...' });

    let webhooks: Array<{ webhookId: string; slug?: string; title?: string; flowType?: 'image' | 'video' }>;

    if (specificWebhookIds && specificWebhookIds.length > 0) {
      // Manual mode: Test only specified webhook IDs
      sendEvent({ type: 'init', message: `Testing ${specificWebhookIds.length} specific webhooks...` });
      webhooks = specificWebhookIds.map(id => ({ webhookId: id }));
    } else {
      // Auto mode: Fetch all webhooks from API
      const flowLandings = await fetchAllFlowLandings();
      webhooks = flowLandings
        .filter((landing: FlowLandingItem) => landing.flow?.flowId)
        .map((landing: FlowLandingItem) => ({
          webhookId: landing.flow.flowId,
          slug: landing.slug,
          title: landing.title,
          flowType: landing.type
        }));
    }

    const total = webhooks.length;
    sendEvent({ type: 'init', total });

    let passed = 0;
    let failed = 0;
    const allResults: WebhookTestResult[] = [];

    // Continuous queue-based concurrency (maintain 50 running at all times)
    const concurrency = 50;
    let currentIndex = 0;
    let activeCount = 0;
    const runningTasks = new Set<Promise<void>>();

    // Function to test a single webhook
    async function testWebhook(webhook: typeof webhooks[0], index: number) {
      const displayName = webhook.slug || webhook.webhookId;
      const startTime = Date.now();

      sendEvent({
        type: 'progress',
        current: index + 1,
        total,
        webhook: displayName
      });

      try {
        // Fetch schema
        const schemaResponse = await fetchCmsSchema(webhook.webhookId);
        const params = buildParamsFromSchema(schemaResponse.data);

        // Submit webhook
        const submitResponse = await submitMagicFlowWebhook(webhook.webhookId, params);
        const jobId = submitResponse.response.id;

        // Poll for results
        const jobResult = await pollJobResult(jobId);

        // Extract media results
        const results: Array<{ type: string; url: string }> = [];
        if (jobResult.response.result) {
          for (const item of jobResult.response.result) {
            if (isMediaResult(item)) {
              const mediaData = item.result as MediaRecord;
              results.push({
                type: item.type,
                url: mediaData.url
              });
            }
          }
        }

        const durationMs = Date.now() - startTime;
        passed++;

        const testResult: WebhookTestResult = {
          webhookId: webhook.webhookId,
          slug: webhook.slug,
          title: webhook.title,
          flowType: webhook.flowType,
          success: true,
          results,
          durationMs,
          logs: []
        };

        allResults.push(testResult);

        sendEvent({
          type: 'result',
          result: {
            webhookId: webhook.webhookId,
            slug: webhook.slug,
            title: webhook.title,
            status: 'success',
            results
          }
        });

      } catch (error) {
        const durationMs = Date.now() - startTime;
        failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);

        const testResult: WebhookTestResult = {
          webhookId: webhook.webhookId,
          slug: webhook.slug,
          title: webhook.title,
          flowType: webhook.flowType,
          success: false,
          error: errorMsg,
          results: [],
          durationMs,
          logs: []
        };

        allResults.push(testResult);

        sendEvent({
          type: 'result',
          result: {
            webhookId: webhook.webhookId,
            slug: webhook.slug,
            title: webhook.title,
            status: 'failed',
            error: errorMsg
          }
        });
      }
    }

    // Start initial batch of webhooks
    while (currentIndex < Math.min(concurrency, webhooks.length)) {
      const index = currentIndex++;
      const task = testWebhook(webhooks[index], index).then(() => {
        activeCount--;
        runningTasks.delete(task);
      });
      runningTasks.add(task);
      activeCount++;
    }

    // Process remaining webhooks as slots become available
    while (currentIndex < webhooks.length || runningTasks.size > 0) {
      if (runningTasks.size > 0) {
        // Wait for at least one task to complete
        await Promise.race(runningTasks);

        // Start new task if there are more webhooks to test
        if (currentIndex < webhooks.length) {
          const index = currentIndex++;
          const task = testWebhook(webhooks[index], index).then(() => {
            activeCount--;
            runningTasks.delete(task);
          });
          runningTasks.add(task);
          activeCount++;
        }
      }
    }

    // Generate dated HTML report
    const reportPath = generateDatedReport(allResults);

    sendEvent({
      type: 'complete',
      passed,
      failed,
      total,
      reportPath
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    sendEvent({ type: 'error', message: errorMsg });
  }

  res.end();
}

/**
 * Handle reports list request
 */
function handleReportsRequest(req: IncomingMessage, res: ServerResponse): void {
  try {
    const artifactsDir = './artifacts';

    // Get all test report files
    const files = readdirSync(artifactsDir)
      .filter(f => f.startsWith('test-') && f.endsWith('.html'))
      .map(filename => {
        const filepath = join(artifactsDir, filename);
        const stats = statSync(filepath);
        return {
          filename,
          created: stats.birthtime.toISOString(),
          size: stats.size
        };
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(files));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to read reports' }));
  }
}

/**
 * Request handler
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url === '/' && method === 'GET') {
    serveHtml(res);
  } else if (url === '/api/test' && method === 'POST') {
    await handleTestRequest(req, res);
  } else if (url === '/api/test-all' && method === 'POST') {
    await handleTestAllRequest(req, res);
  } else if (url === '/api/reports' && method === 'GET') {
    handleReportsRequest(req, res);
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
}

// Create and start server
const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Request error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

server.listen(PORT, () => {
  console.log('🚀 Webhook Tester running at http://localhost:' + PORT);
  console.log('   Enter a webhook ID in the browser to test it');
});
