/**
 * CMS Schema item from GET /api/flows-content/schema/{webhookId}
 */
export interface CmsSchemaItem {
  type: string;
  key: string;
}

/**
 * Response from CMS schema endpoint
 */
export interface CmsSchemaResponse {
  success: boolean;
  data: CmsSchemaItem[];
}

/**
 * Param value for image/video - contains url
 */
export interface MediaParamValue {
  url: string;
}

/**
 * Param value for text - contains value
 */
export interface TextParamValue {
  value: string;
}

/**
 * Dynamic params object - keys are param names from CMS schema
 */
export type WebhookParams = Record<string, MediaParamValue | TextParamValue>;

/**
 * Drive options for saving results
 */
export interface DriveOptions {
  folderName: string;
  packageId: string;
}

/**
 * Request body for POST /workflows/magic-flow-webhook/submit
 */
export interface SubmitRequest {
  params: {
    webhookId: string;
    params: WebhookParams;
    driveOptions: DriveOptions;
  };
}

/**
 * Response from POST /workflows/magic-flow-webhook/submit
 */
export interface SubmitResponse {
  status: string;
  response: {
    id: string;
  };
}

/**
 * Job status values
 */
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Metadata for media results
 */
export interface MediaMetadata {
  width: number;
  height: number;
  duration: number | null;
  mimeType: string;
  ratio: string;
}

/**
 * Record for image/video results
 */
export interface MediaRecord {
  url: string;
  metadata?: MediaMetadata;
}

/**
 * Record for text results
 */
export interface TextRecord {
  value: string;
}

/**
 * Result item from the job
 */
export interface ResultItem {
  type: 'image' | 'video' | 'text';
  result: MediaRecord | TextRecord;
}

/**
 * Response from GET /workflows/magic-flow-webhook/{id}/result
 */
export interface JobResultResponse {
  status: string;
  response: {
    id: string;
    status: JobStatus;
    created: string;
    updated: string;
    result: ResultItem[];
    subTasks: any;
    usage: {
      credits: number;
      details: any[];
    };
  };
}

/**
 * Collected result for a single media param
 */
export interface MediaResult {
  type: string;
  url: string;
  metadata?: MediaMetadata;
}

/**
 * Test result for a single webhook
 */
export interface WebhookTestResult {
  webhookId: string;
  /** Slug from flow-landings API */
  slug?: string;
  /** Title from flow-landings API */
  title?: string;
  /** Category name from flow-landings API */
  category?: string;
  /** Type from flow-landings API (image or video) */
  flowType?: 'image' | 'video';
  success: boolean;
  error?: string;
  results: MediaResult[];
  /** Execution logs for debugging */
  logs?: string[];
  /** Duration in milliseconds */
  durationMs?: number;
}

/**
 * Flow schema from flow-landings API
 */
export interface FlowLandingSchema {
  key: string;
  type: string;
}

/**
 * Flow info from flow-landings API
 */
export interface FlowLandingFlow {
  flowId: string;
  schema: FlowLandingSchema[];
  presetCreditCount?: number;
}

/**
 * Single flow landing item from the API
 */
export interface FlowLandingItem {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  flow: FlowLandingFlow;
  type: 'image' | 'video';
  redirectionUrl: string;
  category?: string;  // Category is a simple string, not an object
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  locale: string;
}

/**
 * Pagination info from flow-landings API
 */
export interface FlowLandingPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

/**
 * Response from flow-landings API
 */
export interface FlowLandingsResponse {
  data: FlowLandingItem[];
  meta: {
    pagination: FlowLandingPagination;
  };
}
