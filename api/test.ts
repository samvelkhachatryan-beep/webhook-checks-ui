import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchCmsSchema, buildParamsFromSchema, submitMagicFlowWebhook, pollJobResult, isMediaResult } from '../src/api/client';
import { MediaRecord } from '../src/types';

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

  const { webhookId } = req.body;
  
  if (!webhookId) {
    return res.status(400).json({ error: 'webhookId is required' });
  }

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

    res.status(200).json({ success: true, results, logs });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logs.push('Error: ' + errorMsg);
    
    res.status(200).json({ success: false, error: errorMsg, logs });
  }
}

