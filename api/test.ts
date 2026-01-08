import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: PICSART_API_TOKEN environment variable is not set',
      logs: ['Environment variable PICSART_API_TOKEN is missing']
    });
  }

  // Dynamically import to avoid module resolution issues
  const clientModule = await import('../src/api/client.js');
  const { fetchCmsSchema, buildParamsFromSchema, submitMagicFlowWebhook, pollJobResult, isMediaResult } = clientModule;

  const { webhookId } = req.body;

  if (!webhookId) {
    return res.status(400).json({ error: 'webhookId is required' });
  }

  const logs: string[] = [];

  console.log('🔄 Single webhook test request for:', webhookId);

  try {
    console.log('📋 Fetching CMS schema...');
    logs.push('Fetching CMS schema...');
    const schemaResponse = await fetchCmsSchema(webhookId);
    logs.push('Schema fetched: ' + schemaResponse.data.length + ' items');
    logs.push('Schema: ' + JSON.stringify(schemaResponse.data));
    console.log('✅ Schema fetched:', schemaResponse.data.length, 'items');

    const params = buildParamsFromSchema(schemaResponse.data);
    logs.push('Built params: ' + JSON.stringify(params));
    console.log('✅ Params built');

    console.log('📤 Submitting webhook...');
    logs.push('Submitting webhook...');
    const submitResponse = await submitMagicFlowWebhook(webhookId, params);
    const jobId = submitResponse.response.id;
    logs.push('Job submitted: ' + jobId);
    console.log('✅ Job submitted:', jobId);

    console.log('⏳ Polling for results (this can take 1-5 minutes)...');
    logs.push('Polling for results...');
    const jobResult = await pollJobResult(jobId);
    logs.push('Job completed with ' + (jobResult.response.result?.length || 0) + ' results');
    console.log('✅ Job completed with', jobResult.response.result?.length || 0, 'results');

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

    console.log('✅ Sending successful response');
    res.status(200).json({ success: true, results, logs });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ Error in single webhook test:', errorMsg);
    logs.push('Error: ' + errorMsg);

    res.status(200).json({ success: false, error: errorMsg, logs });
  }
}

