import type { VercelRequest, VercelResponse } from '@vercel/node';

interface FlowLandingItem {
  flow: { flowId: string };
  slug?: string;
  title?: string;
  type?: 'image' | 'video';
}

interface WebhookTestResult {
  webhookId: string;
  slug?: string;
  title?: string;
  flowType?: 'image' | 'video';
  success: boolean;
  results: Array<{ type: string; url: string }>;
  error?: string;
  durationMs: number;
  logs: string[];
}

interface MediaRecord {
  url: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API token early
  if (!process.env.PICSART_API_TOKEN) {
    // Send error as SSE event since client expects streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Server configuration error: PICSART_API_TOKEN environment variable is not set'
    })}\n\n`);
    return res.end();
  }

  // Dynamically import to avoid module resolution issues
  const clientModule = await import('../src/api/client.js');
  const { fetchCmsSchema, buildParamsFromSchema, submitMagicFlowWebhook, pollJobResult, isMediaResult, fetchAllFlowLandings } = clientModule;

  const htmlReportModule = await import('../src/utils/htmlReport.js');
  const { generateDatedReport } = htmlReportModule;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.status(200); // Ensure status is set

  // Track if client disconnected to prevent memory leaks
  let isClientConnected = true;
  const cleanup = () => {
    isClientConnected = false;
  };

  // Listen for client disconnect
  req.on('close', cleanup);
  req.on('end', cleanup);

  function sendEvent(data: any) {
    if (!isClientConnected) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Force flush to ensure immediate delivery
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch (error) {
      // Client disconnected, stop sending
      isClientConnected = false;
    }
  }

  // Send immediate connection confirmation
  sendEvent({ type: 'connected', message: 'Stream established' });

  try {
    // Get optional specific webhook IDs from request body
    const { webhookIds } = req.body || {};
    const specificWebhookIds: string[] | null = webhookIds || null;

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
      // Check if client is still connected before processing
      if (!isClientConnected) {
        throw new Error('Client disconnected');
      }

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

    // Generate dated HTML report (skip on Vercel - file system is read-only)
    let reportPath = null;
    try {
      reportPath = generateDatedReport(allResults);
    } catch (error) {
      console.log('Report generation skipped (read-only filesystem):', error);
      // This is expected on Vercel - reports are client-side only
    }

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

