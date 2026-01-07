import type { VercelRequest, VercelResponse } from '@vercel/node';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers first
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

  try {
    const artifactsDir = join(process.cwd(), 'artifacts');

    // Check if artifacts directory exists
    // Note: On Vercel, this will be ephemeral and may not persist between function calls
    if (!existsSync(artifactsDir)) {
      console.log('Artifacts directory not found, returning empty array');
      return res.status(200).json([]);
    }

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

    res.status(200).json(files);
  } catch (error) {
    console.error('Error reading reports:', error);
    // Return empty array instead of error for better UX
    res.status(200).json([]);
  }
}

