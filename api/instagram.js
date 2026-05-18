const HIGHLIGHT_IDS = ['18071980868164936'];
const IG_API = `https://i.instagram.com/api/v1/feed/reels_media/?${HIGHLIGHT_IDS.map(id => `reel_ids=highlight:${id}`).join('&')}`;
const CACHE_TTL = 30 * 60 * 1000;

let _cache = null;
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

    const rawSession = process.env.INSTAGRAM_SESSION_ID;
    if (!rawSession) {
      throw new Error('Missing INSTAGRAM_SESSION_ID environment variable.');
    }
    const sessionId = decodeURIComponent(rawSession);

    const igRes = await fetch(IG_API, {
      headers: {
        'User-Agent':        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Cookie':            `sessionid=${sessionId}`,
        'X-IG-App-ID':       '936619743392459',
        'Accept':            '*/*',
        'Accept-Language':   'ca-ES,ca;q=0.9,en;q=0.8',
        'Accept-Encoding':   'gzip, deflate, br',
        'Origin':            'https://www.instagram.com',
        'Referer':           'https://www.instagram.com/',
        'Sec-Fetch-Mode':    'cors',
        'Sec-Fetch-Site':    'same-site',
        'Sec-Fetch-Dest':    'empty',
        'X-Requested-With':  'XMLHttpRequest',
      },
    });

    if (!igRes.ok) {
      const body = await igRes.text();
      throw new Error(`Instagram responded ${igRes.status}: ${body.slice(0, 300)}`);
    }

    const data = await igRes.json();

    const topLevelKeys = Object.keys(data ?? {});
    const reelsMap = data?.reels ?? data?.reels_media ?? {};
    const reelsMapKeys = Object.keys(reelsMap);

    let items = [];
    for (const id of HIGHLIGHT_IDS) {
      const reel = reelsMap[`highlight:${id}`];
      if (!reel) continue;
      const reelItems = (reel.items ?? [])
        .map((item) => {
          const candidates = item.image_versions2?.candidates ?? [];
          const best = candidates.reduce(
            (a, b) => (b.width > a.width ? b : a),
            candidates[0] ?? {}
          );
          return { id: item.id, imageUrl: best.url ?? null, takenAt: item.taken_at };
        })
        .filter((i) => i.imageUrl);
      items = items.concat(reelItems);
    }
    items.sort((a, b) => b.takenAt - a.takenAt);

    return res.status(200).json({
      items,
      _debug: {
        topLevelKeys,
        reelsMapKeys,
        highlightFound: reelsMapKeys.some(k => HIGHLIGHT_IDS.some(id => k.includes(id))),
      },
    });

  } catch (err) {
    console.error('[api/instagram]', err.message);
    return res.status(500).json({ error: err.message, items: [] });
  }
};
