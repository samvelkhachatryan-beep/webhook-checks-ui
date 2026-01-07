import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  return res.status(200).json({ 
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    env: {
      hasApiToken: !!process.env.PICSART_API_TOKEN,
      nodeVersion: process.version
    }
  });
}

