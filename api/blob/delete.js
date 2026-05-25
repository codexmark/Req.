import { del } from '@vercel/blob';
import { requireSession } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireSession(req, res);
  if (!auth) {
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const targets = Array.isArray(body.targets) ? body.targets.filter(Boolean) : [];

    if (targets.length > 0) {
      await del(targets);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Blob delete error:', error);
    return res.status(500).json({
      error: 'Blob delete failed',
      details: error?.message || 'Unknown error',
    });
  }
}
