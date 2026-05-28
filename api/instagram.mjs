import {
  IG_API_URL,
  buildInstagramHeaders,
  extractHighlightItems,
  isInstagramEnabled,
} from './_lib/instagram.mjs';

const CACHE_TTL = 30 * 60 * 1000;
let _cache = null;
let _cacheExpiry = 0;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=1800');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!isInstagramEnabled()) {
    return res.status(200).json({ items: [], disabled: true });
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return res.status(200).json(_cache);
    }

    const rawSession = process.env.INSTAGRAM_SESSION_ID;
    if (!rawSession) {
      throw new Error('Missing INSTAGRAM_SESSION_ID environment variable.');
    }
    const sessionId = decodeURIComponent(rawSession);

    const igRes = await fetch(IG_API_URL, {
      headers: buildInstagramHeaders(sessionId),
    });

    if (!igRes.ok) {
      const body = await igRes.text();
      throw new Error(`Instagram responded ${igRes.status}: ${body.slice(0, 300)}`);
    }

    const data = await igRes.json();
    const items = extractHighlightItems(data);

    const payload = { items };
    _cache = payload;
    _cacheExpiry = Date.now() + CACHE_TTL;

    return res.status(200).json(payload);
  } catch (err) {
    console.error('[api/instagram]', err.message);
    return res.status(500).json({ error: err.message, items: [] });
  }
}
