import { VercelRequest, VercelResponse } from '@vercel/node';
import { initDatabase } from './_lib/db';
import { handleCors } from './utils/cors';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await initDatabase();
    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error: any) {
    console.error('Database initialization error:', error);
    res.status(500).json({ error: error.message });
  }
}

