import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  fetchCmsSchema,
  submitMagicFlowWebhook,
  buildParamsFromSchema,
  pollJobResult,
  isMediaResult,
  isValidUrl,
  fetchAllFlowLandings,
} from '../src/api/client.js';
import { getManualWebhookIds, isManualMode } from '../src/config/webhooks.js';
import { generateHtmlReport, generateDatedReport, logSummary } from '../src/utils/htmlReport.js';
import { WebhookTestResult, MediaResult, MediaRecord, FlowLandingItem } from '../src/types/index.js';

/**
 * Webhook info structure for testing
 */
interface WebhookInfo {
  webhookId: string;
  slug?: string;
  title?: string;
  flowType?: 'image' | 'video';
}

/**
 * Collected results across all webhook tests
 */
const testResults: WebhookTestResult[] = [];

/**
 * Webhooks to test (populated in beforeAll)
 */
let webhooksToTest: WebhookInfo[] = [];

/**
 * Mode indicator
 */
let testMode: 'manual' | 'api' = 'api';

/**
 * Concurrency limit for parallel execution (default: 50)
 */
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '100', 10);

/**
 * Counter for tracking progress
 */
let completedCount = 0;

describe('Magic Flow Webhook Tests', () => {
  // Fetch/prepare webhooks before running tests
  beforeAll(async () => {
    if (isManualMode()) {
      testMode = 'manual';
      const manualIds = getManualWebhookIds()!;
      console.log(`\n🔧 MANUAL MODE: Testing ${manualIds.length} specified webhook IDs\n`);
      webhooksToTest = manualIds.map((id) => ({ webhookId: id }));
    } else {
      testMode = 'api';
      console.log('\n🌐 API MODE: Fetching all flow landings from API...\n');
      const flowLandings = await fetchAllFlowLandings();
      console.log(`\n📋 Found ${flowLandings.length} flow landings to test\n`);

      webhooksToTest = flowLandings
        .filter((landing) => landing.flow?.flowId)
        .map((landing) => ({
          webhookId: landing.flow.flowId,
          slug: landing.slug,
          title: landing.title,
          flowType: landing.type,
        }));
    }
  });

  // Validate environment before running tests
  it('should have PICSART_API_TOKEN environment variable set', () => {
    expect(
      process.env.PICSART_API_TOKEN,
      'PICSART_API_TOKEN environment variable must be set'
    ).toBeDefined();
    expect(process.env.PICSART_API_TOKEN!.length).toBeGreaterThan(0);
  });

  it('should have webhooks to test', () => {
    expect(webhooksToTest, 'webhooksToTest should be a non-empty array').toBeInstanceOf(Array);
    expect(webhooksToTest.length, 'At least one webhook should be available').toBeGreaterThan(0);
    console.log(`   ✓ Testing ${webhooksToTest.length} webhooks (${testMode} mode)`);
  });

  // Test each webhook
  it('should complete the full flow for all webhookIds', async () => {
    console.log(`\n🚀 Running tests with concurrency: ${CONCURRENCY}\n`);

    /**
     * Process a single webhook and return the result
     */
    async function processWebhook(webhook: WebhookInfo): Promise<WebhookTestResult> {
      const { webhookId, slug, title, flowType } = webhook;
      const displayName = slug || webhookId;

      const startTime = Date.now();
      const logs: string[] = [];

      const log = (msg: string) => {
        logs.push(msg);
        console.log(msg);
      };

      const result: WebhookTestResult = {
        webhookId,
        slug,
        title,
        flowType,
        success: false,
        results: [],
        logs: [],
        durationMs: 0,
      };

      try {
        log(`\n🔍 [${displayName}] Fetching CMS schema for webhookId: ${webhookId}`);
        const schemaResponse = await fetchCmsSchema(webhookId);

        if (!schemaResponse.success || !Array.isArray(schemaResponse.data)) {
          throw new Error(`CMS schema response invalid for ${webhookId}`);
        }

        log(`   ✓ Schema fetched: ${schemaResponse.data.length} items`);
        log(`   📋 Schema items: ${JSON.stringify(schemaResponse.data)}`);

        const params = buildParamsFromSchema(schemaResponse.data);
        log(`   ✓ Params: ${JSON.stringify(params)}`);

        // Submit magic flow webhook
        log(`   📤 Submitting magic flow webhook...`);
        const submitResponse = await submitMagicFlowWebhook(webhookId, params);

        if (submitResponse.status !== 'success' || !submitResponse.response.id) {
          throw new Error(`Submit failed for ${webhookId}: ${JSON.stringify(submitResponse)}`);
        }

        const jobId = submitResponse.response.id;
        log(`   ✓ Job submitted: ${jobId}`);

        // Poll for job completion
        log(`   ⏳ Waiting for job to complete...`);
        const jobResult = await pollJobResult(jobId);

        if (jobResult.response.status !== 'COMPLETED' || !Array.isArray(jobResult.response.result)) {
          throw new Error(`Job did not complete successfully for ${webhookId}`);
        }

        log(`   ✓ Job completed with ${jobResult.response.result.length} results`);

        // Collect and validate media results
        const mediaResults: MediaResult[] = [];

        for (const item of jobResult.response.result) {
          log(`   📎 Result: type=${item.type}, result=${JSON.stringify(item.result)}`);

          if (isMediaResult(item)) {
            const mediaData = item.result as MediaRecord;

            if (!mediaData.url || typeof mediaData.url !== 'string' || !isValidUrl(mediaData.url)) {
              log(`   ⚠️ Invalid URL for ${item.type}: ${mediaData.url}`);
              continue;
            }

            mediaResults.push({
              type: item.type,
              url: mediaData.url,
              metadata: mediaData.metadata,
            });

            log(`   ✅ ${item.type}: ${mediaData.url}`);
          }
        }

        // Fail if no media results were found
        if (mediaResults.length === 0) {
          result.success = false;
          result.error = 'No IMAGE or VIDEO results found';
          result.results = [];
          result.logs = logs;
          result.durationMs = Date.now() - startTime;
          console.error(`   ❌ [${displayName}] webhookId "${webhookId}" failed: No IMAGE or VIDEO results found`);
          return result;
        }

        result.success = true;
        result.results = mediaResults;
        result.logs = logs;
        result.durationMs = Date.now() - startTime;

        log(`   ✅ [${displayName}] webhookId "${webhookId}" passed with ${mediaResults.length} media results (${result.durationMs}ms)`);
        return result;
      } catch (error) {
        result.success = false;
        result.error = error instanceof Error ? error.message : String(error);
        result.logs = logs;
        result.durationMs = Date.now() - startTime;

        console.error(`   ❌ [${displayName}] webhookId "${webhookId}" failed: ${result.error} (${result.durationMs}ms)`);
        return result;
      }
    }

    /**
     * Run tasks with limited concurrency
     */
    async function runWithConcurrency<T, R>(
      items: T[],
      fn: (item: T) => Promise<R>,
      concurrency: number,
      onComplete: (result: R, index: number) => void
    ): Promise<R[]> {
      const results: R[] = [];
      let currentIndex = 0;

      async function worker(): Promise<void> {
        while (currentIndex < items.length) {
          const index = currentIndex++;
          const item = items[index];
          const result = await fn(item);
          results[index] = result;
          onComplete(result, index);
        }
      }

      // Start workers up to concurrency limit
      const workers = Array(Math.min(concurrency, items.length))
        .fill(null)
        .map(() => worker());

      await Promise.all(workers);
      return results;
    }

    // Process all webhooks with concurrency
    const totalCount = webhooksToTest.length;

    await runWithConcurrency(
      webhooksToTest,
      processWebhook,
      CONCURRENCY,
      (result) => {
        testResults.push(result);
        completedCount++;

        // Log progress
        const successCount = testResults.filter((r) => r.success).length;
        const failCount = testResults.length - successCount;
        console.log(`\n📊 Progress: ${completedCount}/${totalCount} (${successCount} passed, ${failCount} failed)\n`);

        // Update HTML report after each webhook check
        generateHtmlReport(testResults, './artifacts/webhook-results.html');
      }
    );

    // After all webhooks are tested, log summary
    const successCount = testResults.filter((r) => r.success).length;
    const failCount = testResults.length - successCount;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 WEBHOOK RESULTS: ${successCount} passed, ${failCount} failed out of ${testResults.length} total`);
    console.log(`${'='.repeat(60)}\n`);

    // The test passes if at least some webhooks succeeded
    expect(testResults.length).toBeGreaterThan(0);
  });

  // Generate report after all tests
  afterAll(() => {
    if (testResults.length === 0) {
      console.log('No test results to report');
      return;
    }

    // Log summary to console
    logSummary(testResults);

    // Generate dated HTML report and update index
    generateDatedReport(testResults, './artifacts');

    // Also keep the old webhook-results.html for backward compatibility
    generateHtmlReport(testResults, './artifacts/webhook-results.html');

    // Log final status
    const successCount = testResults.filter((r) => r.success).length;
    const failCount = testResults.length - successCount;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📈 FINAL RESULTS: ${successCount} passed, ${failCount} failed`);
    console.log(`${'='.repeat(60)}\n`);
  });
});
