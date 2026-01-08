import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Serve individual report files
 * GET /api/report?file=test-20260108-144755.html
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file } = req.query;

  if (!file || typeof file !== 'string') {
    return res.status(400).json({ error: 'file parameter is required' });
  }

  // Validate filename (prevent path traversal)
  if (file.includes('..') || file.includes('/') || file.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  try {
    const artifactsDir = join(process.cwd(), 'artifacts');
    const filePath = join(artifactsDir, file);

    console.log('📊 Report request:', file);

    // Check if artifacts directory exists
    // Note: On Vercel, file system is ephemeral - reports won't persist
    if (!existsSync(artifactsDir)) {
      console.log('Artifacts directory not found (expected on Vercel)');
      return res.status(404).send(`
        <html>
          <head><title>Report Not Available</title></head>
          <body style="font-family: monospace; background: #0a0a0a; color: #ff4466; padding: 2rem; text-align: center;">
            <h1>📭 Report Not Available</h1>
            <p>Reports are not persisted on Vercel's serverless environment.</p>
            <p>Reports are only available during the session on the client side.</p>
            <p><a href="/" style="color: #00ff88;">← Back to Webhook Tester</a></p>
          </body>
        </html>
      `);
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log('❌ Report not found:', filePath);
      return res.status(404).send(`
        <html>
          <head><title>Report Not Found</title></head>
          <body style="font-family: monospace; background: #0a0a0a; color: #ff4466; padding: 2rem; text-align: center;">
            <h1>404 - Report Not Found</h1>
            <p>The requested report does not exist: ${file}</p>
            <p><a href="/" style="color: #00ff88;">← Back to Webhook Tester</a></p>
          </body>
        </html>
      `);
    }

    // Read and serve the report
    const content = readFileSync(filePath, 'utf-8');
    console.log('✅ Serving report:', file);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(content);
    
  } catch (error) {
    console.error('Error reading report:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: monospace; background: #0a0a0a; color: #ff4466; padding: 2rem; text-align: center;">
          <h1>500 - Error Loading Report</h1>
          <p>An error occurred while loading the report.</p>
          <p><a href="/" style="color: #00ff88;">← Back to Webhook Tester</a></p>
        </body>
      </html>
    `);
  }
}

