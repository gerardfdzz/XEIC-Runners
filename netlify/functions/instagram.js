const HIGHLIGHT_ID = '18071980868164936';
const IG_API       = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=highlight:${HIGHLIGHT_ID}`;
const CACHE_TTL    = 30 * 60 * 1000;

let _cache       = null;
let _cacheExpiry = 0;

exports.handler = async (event) => {
  const HEADERS = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'public, s-maxage=1800',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(_cache) };
    }

    const sessionId = process.env.INSTAGRAM_SESSION_ID;
    if (!sessionId) {
      throw new Error('Falta INSTAGRAM_SESSION_ID a les variables d\'entorn.');
    }

    const res = await fetch(IG_API, {
      headers: {
        'User-Agent':      'Instagram 219.0.0.12.117 Android (28/9; 420dpi; 1080x2145; samsung; SM-G991B; o1s; exynos2100)',
        'Cookie':          `sessionid=${sessionId}`,
        'X-IG-App-ID':     '936619743392459',
        'Accept':          '*/*',
        'Accept-Language': 'ca-ES,ca;q=0.9',
      },
    });

    const data = await res.json();

    const reel = data?.reels?.[`highlight:${HIGHLIGHT_ID}`];
    if (!reel) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ items: [] }) };
    }

    const items = (reel.items ?? []).map((item) => {
      const candidates = item.image_versions2?.candidates ?? [];
      const best = candidates.reduce((a, b) => (b.width > a.width ? b : a), candidates[0] ?? {});
      return {
        id:       item.id,
        imageUrl: best.url ?? null,
        takenAt:  item.taken_at,
      };
    }).filter((i) => i.imageUrl);

    items.sort((a, b) => b.takenAt - a.takenAt);

    _cache       = { items };
    _cacheExpiry = Date.now() + CACHE_TTL;

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(_cache) };

  } catch (err) {
    console.error('[instagram function]', err);
    return {
      statusCode: 500,
      headers:    HEADERS,
      body:       JSON.stringify({ error: err.message, items: [] }),
    };
  }
};
