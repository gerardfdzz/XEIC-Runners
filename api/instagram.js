/**
 * Vercel serverless function — Instagram Highlights proxy
 * GET /api/instagram → { items: [{ id, imageUrl, takenAt }] }
 *
 * Required environment variable (Vercel → Settings → Environment Variables):
 *   INSTAGRAM_SESSION_ID → sessionid cookie from a logged-in @xeicrunners browser session
 *
 * How to get it:
 *   1. Open Chrome logged in as @xeicrunners at instagram.com
 *   2. DevTools → Application → Cookies → https://www.instagram.com
 *   3. Copy the value of "sessionid"
 */

const HIGHLIGHT_ID = '18071980868164936';
const IG_API       = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=highlight:${HIGHLIGHT_ID}`;
const CACHE_TTL    = 30 * 60 * 1000; // 30 min (Instagram CDN URLs expire)

let _cache       = null;
let _cacheExpiry = 0;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=1800');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return res.status(200).json(_cache);
    }

    const sessionId = process.env.INSTAGRAM_SESSION_ID;
    if (!sessionId) {
      throw new Error('Missing INSTAGRAM_SESSION_ID environment variable.');
    }

    const igRes = await fetch(IG_API, {
      headers: {
        'User-Agent':      'Instagram 219.0.0.12.117 Android (28/9; 420dpi; 1080x2145; samsung; SM-G991B; o1s; exynos2100)',
        'Cookie':          `sessionid=${sessionId}`,
        'X-IG-App-ID':     '936619743392459',
        'Accept':          '*/*',
        'Accept-Language': 'ca-ES,ca;q=0.9',
      },
    });

    const data = await igRes.json();
    const reel  = data?.reels?.[`highlight:${HIGHLIGHT_ID}`];

    let items = [];
    if (reel) {
      items = (reel.items ?? [])
        .map((item) => {
          const candidates = item.image_versions2?.candidates ?? [];
          const best = candidates.reduce(
            (a, b) => (b.width > a.width ? b : a),
            candidates[0] ?? {}
          );
          return { id: item.id, imageUrl: best.url ?? null, takenAt: item.taken_at };
        })
        .filter((i) => i.imageUrl)
        .sort((a, b) => b.takenAt - a.takenAt);
    }

    _cache       = { items };
    _cacheExpiry = Date.now() + CACHE_TTL;

    return res.status(200).json(_cache);

  } catch (err) {
    console.error('[api/instagram]', err.message);
    return res.status(500).json({ error: err.message, items: [] });
  }
};
