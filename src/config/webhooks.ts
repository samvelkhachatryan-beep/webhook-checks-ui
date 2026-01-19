/**
 * Configuration for webhook testing
 * 
 * Two modes available:
 * 1. MANUAL MODE: Set WEBHOOK_IDS environment variable with comma-separated IDs
 *    Example: WEBHOOK_IDS="id1,id2,id3" npm test
 * 
 * 2. API MODE: Leave WEBHOOK_IDS empty to fetch all flowIds from:
 *    https://api-cms.gen.ai/api/flow-landings
 */

/**
 * API Base URLs
 */
export const API_BASE_URL = 'https://api.picsart.com';
export const WORKFLOWS_BASE_URL = 'https://api.picsart.com/workflows';

/**
 * Placeholder assets for testing (used when building params from CMS schema)
 * Update these with valid, accessible URLs for your tests
 */
export const PLACEHOLDER_ASSETS = {
  image: {
    url: 'https://cdn-pipeline-output.picsart.com/magic-flow/555a2382-2a0c-439d-8a6d-4bc21bd7757e.png?type=webp&to=min&r=404',
  },
  image2: {
    url: 'https://cdnmf.picsart.com/cloud-storage/dd402124-c130-4014-ac7b-9f0d4c952ff4.webp',
  },
  image3: {
    url: 'https://cdnmf.picsart.com/cloud-storage/f9d95a8f-58b8-4ffe-95cc-c8fbc06ec099.jpeg?type=webp&to=min&r=404',
  },
  video: {
    url: 'https://cdn-pipeline-output.picsart.com/magic-flow/cad88d5f-d8d2-4ec0-be17-b8e69694f237.mp4',
  },
  text: {
    value: 'High quality, professional',
  },
  prompt: {
    value: 'Professional photo, high quality, detailed',
  },
};

/**
 * Get manual webhook IDs from environment variable
 * @returns Array of webhook IDs or null if not set
 */
export function getManualWebhookIds(): string[] | null {
  const envIds = process.env.WEBHOOK_IDS;
  if (!envIds || envIds.trim() === '') {
    return null;
  }
  return envIds
    .split(',')
    .map((id: string) => id.trim())
    .filter((id: string) => id.length > 0);
}

/**
 * Check if running in manual mode
 */
export function isManualMode(): boolean {
  return getManualWebhookIds() !== null;
}
