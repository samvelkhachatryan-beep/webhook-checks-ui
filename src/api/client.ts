import {
  CmsSchemaResponse,
  CmsSchemaItem,
  SubmitRequest,
  SubmitResponse,
  JobResultResponse,
  ResultItem,
  WebhookParams,
  MediaRecord,
  FlowLandingsResponse,
  FlowLandingItem,
} from '../types/index.js';
import { WORKFLOWS_BASE_URL, PLACEHOLDER_ASSETS } from '../config/webhooks.js';

/**
 * Flow-landings API base URL
 */
const FLOW_LANDINGS_API_URL = 'https://api-cms.gen.ai/api/flow-landings';

/**
 * Fetch all flow landings from the CMS API with pagination support
 * GET https://api-cms.gen.ai/api/flow-landings
 */
export async function fetchAllFlowLandings(): Promise<FlowLandingItem[]> {
  const allItems: FlowLandingItem[] = [];
  let page = 1;
  let hasMorePages = true;

  console.log(`🌐 Fetching flow landings from ${FLOW_LANDINGS_API_URL}`);

  while (hasMorePages) {
    const url = `${FLOW_LANDINGS_API_URL}?pagination[page]=${page}&pagination[pageSize]=100`;

    console.log(`   📄 Fetching page ${page}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Failed to fetch flow landings: HTTP ${response.status} - ${responseText}`
      );
    }

    const data = (await response.json()) as FlowLandingsResponse;
    allItems.push(...data.data);

    console.log(`   ✓ Got ${data.data.length} items (total so far: ${allItems.length})`);

    // Check if there are more pages
    const { page: currentPage, pageCount } = data.meta.pagination;
    hasMorePages = currentPage < pageCount;
    page++;
  }

  console.log(`✅ Fetched ${allItems.length} total flow landings`);
  return allItems;
}

/**
 * Extract unique flowIds from flow landing items
 */
export function extractFlowIds(items: FlowLandingItem[]): string[] {
  const flowIds = items
    .filter((item) => item.flow?.flowId)
    .map((item) => item.flow.flowId);

  // Return unique flowIds
  return [...new Set(flowIds)];
}

/**
 * Fetch all flowIds from the flow-landings API
 * Convenience function that fetches all landings and extracts unique flowIds
 */
export async function fetchAllFlowIds(): Promise<string[]> {
  const items = await fetchAllFlowLandings();
  return extractFlowIds(items);
}

/**
 * Get the API token from environment variable
 */
function getApiToken(): string {
  const token = process.env.PICSART_API_TOKEN;
  if (!token) {
    throw new Error(
      'PICSART_API_TOKEN environment variable is not set. ' +
      'Please set it before running the tests.'
    );
  }
  return token;
}

/**
 * Create headers for API requests
 * @param includeAppHeader - Whether to include the 'app' header for internal requests
 */
function createHeaders(includeAppHeader: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiToken()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'platform': 'web',
    'x-touchpoint': 'magic-flow',
  };

  if (includeAppHeader) {
    headers['app'] = 'com.picsart.internal';
  }

  return headers;
}

/**
 * Fetch CMS schema for a webhook
 * GET https://api-cms.gen.ai/api/flows-content/schema/{webhookId}
 * Note: This endpoint does not require authentication
 */
export async function fetchCmsSchema(
  webhookId: string
): Promise<CmsSchemaResponse> {
  const url = `https://api-cms.gen.ai/api/flows-content/schema/${encodeURIComponent(webhookId)}`;

  console.log(`   🌐 CMS Schema URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  console.log(`   📡 Response status: ${response.status} ${response.statusText}`);

  const responseText = await response.text();
  console.log(`   📡 Response body:`, responseText);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch CMS schema for webhookId "${webhookId}": ` +
      `HTTP ${response.status} - ${responseText}`
    );
  }

  const data = JSON.parse(responseText) as CmsSchemaResponse;
  return data;
}

/**
 * Build webhook params from CMS schema items
 * Maps schema types to appropriate param structures with placeholder values
 * Uses alternating images (image, image2) when multiple image inputs are needed
 */
export function buildParamsFromSchema(schemaItems: CmsSchemaItem[]): WebhookParams {
  const params: WebhookParams = {};
  let imageCount = 0;

  for (const item of schemaItems) {
    const normalizedType = item.type.toLowerCase();

    switch (normalizedType) {
      case 'image':
        // Alternate between image and image2 for multiple image inputs
        const imageUrl = imageCount % 2 === 0
          ? PLACEHOLDER_ASSETS.image.url
          : PLACEHOLDER_ASSETS.image2.url;
        params[item.key] = { url: imageUrl };
        imageCount++;
        break;

      case 'video':
        params[item.key] = {
          url: PLACEHOLDER_ASSETS.video.url,
        };
        break;

      case 'text':
      case 'prompt':
        params[item.key] = {
          value: PLACEHOLDER_ASSETS.text.value,
        };
        break;

      default:
        // For unknown types, default to url-based param
        console.warn(
          `Unknown schema type "${item.type}" for key "${item.key}", defaulting to image`
        );
        params[item.key] = {
          url: PLACEHOLDER_ASSETS.image.url,
        };
    }
  }

  return params;
}

/**
 * Submit magic flow webhook
 * POST /workflows/magic-flow-webhook/submit
 * Returns a job ID that needs to be polled for results
 */
export async function submitMagicFlowWebhook(
  webhookId: string,
  params: WebhookParams
): Promise<SubmitResponse> {
  const url = `${WORKFLOWS_BASE_URL}/magic-flow-webhook/submit`;

  const requestBody: SubmitRequest = {
    params: {
      webhookId,
      params,
      driveOptions: {
        folderName: 'Preset Gen',
        packageId: 'com.picsart.preset-gen',
      },
    },
  };

  console.log(`   📦 Request URL: ${url}`);
  console.log(`   📦 Request body: ${JSON.stringify(requestBody, null, 2)}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders(true),
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log(`   📡 Submit response status: ${response.status}`);
  console.log(`   📡 Submit response body: ${responseText}`);

  if (!response.ok) {
    throw new Error(
      `Failed to submit magic flow webhook for webhookId "${webhookId}": ` +
      `HTTP ${response.status} - ${responseText}`
    );
  }

  const data = JSON.parse(responseText) as SubmitResponse;
  return data;
}

/**
 * Get job result
 * GET /workflows/magic-flow-webhook/{jobId}/result
 */
export async function getJobResult(jobId: string): Promise<JobResultResponse> {
  const url = `${WORKFLOWS_BASE_URL}/magic-flow-webhook/${encodeURIComponent(jobId)}/result`;

  console.log(`   🔄 Polling result URL: ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(true),
  });

  const responseText = await response.text();
  console.log(`   📡 Result response status: ${response.status}`);
  console.log(`   📡 Result response body:`, responseText);

  if (!response.ok) {
    throw new Error(
      `Failed to get job result for jobId "${jobId}": ` +
      `HTTP ${response.status} - ${responseText}`
    );
  }

  const data = JSON.parse(responseText) as JobResultResponse;
  return data;
}

/**
 * Poll for job completion with timeout
 * Default: 150 attempts × 2s = 300s (5 minutes) total timeout
 */
export async function pollJobResult(
  jobId: string,
  maxAttempts: number = 150,
  intervalMs: number = 2000
): Promise<JobResultResponse> {
  console.log(`   ⏳ Polling for job ${jobId} (max ${maxAttempts} attempts, ${intervalMs}ms interval)`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getJobResult(jobId);
    const status = result.response.status;

    console.log(`   📊 Attempt ${attempt}/${maxAttempts}: status = ${status}`);

    if (status === 'COMPLETED') {
      console.log(`   ✅ Job completed!`);
      return result;
    }

    if (status === 'FAILED') {
      throw new Error(`Job ${jobId} failed`);
    }

    // Wait before next poll
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Job ${jobId} did not complete within ${maxAttempts * intervalMs / 1000} seconds`);
}

/**
 * Fetch metadata for specific webhook IDs from flow-landings API
 * Returns a map of webhookId -> metadata
 */
export async function fetchWebhookMetadata(webhookIds: string[]): Promise<Map<string, { slug?: string; title?: string; flowType?: 'image' | 'video' }>> {
  try {
    const allFlowLandings = await fetchAllFlowLandings();
    const metadataMap = new Map<string, { slug?: string; title?: string; flowType?: 'image' | 'video' }>();
    
    allFlowLandings.forEach((landing: FlowLandingItem) => {
      if (landing.flow?.flowId && webhookIds.includes(landing.flow.flowId)) {
        metadataMap.set(landing.flow.flowId, {
          slug: landing.slug,
          title: landing.title,
          flowType: landing.type
        });
      }
    });
    
    return metadataMap;
  } catch (error) {
    console.warn('Failed to fetch webhook metadata:', error);
    // Return empty map if fetching fails - webhooks will show with ID only
    return new Map();
  }
}

/**
 * Check if a result item has a URL (image or video)
 */
export function isMediaResult(item: ResultItem): boolean {
  return (item.type === 'image' || item.type === 'video') && item.result != null && 'url' in item.result;
}

/**
 * Validate that a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  return /^https?:\/\/.+/.test(str);
}
