import { handleUpload } from '@vercel/blob/client';
import { requireSession } from '../_lib/store.js';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireSession(req, res);
  if (!auth) {
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body;
    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = parseClientPayload(clientPayload);
        const allowedContentTypes = payload.kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES;

        return {
          allowedContentTypes,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId: auth.session.userId,
            kind: payload.kind || 'unknown',
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('Blob upload token error:', error);
    return res.status(500).json({
      error: 'Blob upload token failed',
      details: error?.message || 'Unknown error',
    });
  }
}

function parseClientPayload(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}
