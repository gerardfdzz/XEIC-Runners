import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
    const [key, ...rest] = line.split('=');
    if (key && !key.startsWith('#') && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const PORT      = 3000;
const CLUB_ID   = 1576309;
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_BASE  = 'https://www.strava.com/api/v3';

let _cache       = null;
let _cacheExpiry = 0;
const CACHE_TTL  = 5 * 60 * 1000;

const HIGHLIGHT_ID  = '18071980868164936';
const IG_API        = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=highlight:${HIGHLIGHT_ID}`;
const IG_CACHE_TTL  = 30 * 60 * 1000;
let _igCache        = null;
let _igCacheExpiry  = 0;

async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

const server = createServer(async (req, res) => {
  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, HEADERS);
    res.end();
    return;
  }

  if (req.url.startsWith('/api/instagram')) {
    try {
      if (_igCache && Date.now() < _igCacheExpiry) {
        res.writeHead(200, HEADERS);
        res.end(JSON.stringify(_igCache));
        return;
      }

      const rawSession = process.env.INSTAGRAM_SESSION_ID;
      if (!rawSession || rawSession.includes('your_')) {
        throw new Error('Falta INSTAGRAM_SESSION_ID al .env');
      }
      // Decode in case .env stores the URL-encoded form (e.g. %3A instead of :)
      const sessionId = decodeURIComponent(rawSession);

      console.log('📸  Fetching Instagram highlights...');
      const igRes = await fetch(IG_API, {
        headers: {
          'User-Agent':       'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Cookie':           `sessionid=${sessionId}`,
          'X-IG-App-ID':      '936619743392459',
          'Accept':           '*/*',
          'Accept-Language':  'ca-ES,ca;q=0.9,en;q=0.8',
          'Accept-Encoding':  'gzip, deflate, br',
          'Origin':           'https://www.instagram.com',
          'Referer':          'https://www.instagram.com/',
          'Sec-Fetch-Mode':   'cors',
          'Sec-Fetch-Site':   'same-site',
          'Sec-Fetch-Dest':   'empty',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!igRes.ok) {
        const body = await igRes.text();
        throw new Error(`Instagram HTTP ${igRes.status}: ${body.slice(0, 300)}`);
      }

      const data = await igRes.json();
      const reel = data?.reels?.[`highlight:${HIGHLIGHT_ID}`];

      let items = [];
      if (reel) {
        items = (reel.items ?? [])
          .map((item) => {
            const candidates = item.image_versions2?.candidates ?? [];
            const best = candidates.reduce((a, b) => (b.width > a.width ? b : a), candidates[0] ?? {});
            return { id: item.id, imageUrl: best.url ?? null, takenAt: item.taken_at };
          })
          .filter((i) => i.imageUrl)
          .sort((a, b) => b.takenAt - a.takenAt);
      }

      _igCache       = { items };
      _igCacheExpiry = Date.now() + IG_CACHE_TTL;
      console.log(`✅  Instagram: ${items.length} highlights`);

      res.writeHead(200, HEADERS);
      res.end(JSON.stringify(_igCache));
    } catch (err) {
      console.error('❌  Instagram:', err.message);
      res.writeHead(500, HEADERS);
      res.end(JSON.stringify({ error: err.message, items: [] }));
    }
    return;
  }

  if (!req.url.startsWith('/api/strava')) {
    res.writeHead(404, HEADERS);
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      res.writeHead(200, HEADERS);
      res.end(JSON.stringify(_cache));
      return;
    }

    console.log('🔄  Refreshing Strava token...');
    const accessToken = await getAccessToken();
    const auth = { Authorization: `Bearer ${accessToken}` };

    console.log('📡  Fetching club + activities + group events...');
    const [clubRes, activitiesRes, groupEventsRes] = await Promise.all([
      fetch(`${API_BASE}/clubs/${CLUB_ID}`,                        { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/activities?per_page=30`, { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/group_events`,           { headers: auth }),
    ]);

    const [club, activities, groupEvents] = await Promise.all([
      clubRes.json(),
      activitiesRes.json(),
      groupEventsRes.ok ? groupEventsRes.json() : Promise.resolve([]),
    ]);

    _cache = {
      club,
      activities,
      groupEvents: Array.isArray(groupEvents) ? groupEvents : [],
    };
    _cacheExpiry = Date.now() + CACHE_TTL;

    console.log(`✅  Club: ${club.name} · ${club.member_count} membres · ${activities.length} activitats · ${_cache.groupEvents.length} events`);

    res.writeHead(200, HEADERS);
    res.end(JSON.stringify(_cache));
  } catch (err) {
    console.error('❌ ', err.message);
    res.writeHead(500, HEADERS);
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀  Dev API running at:`);
  console.log(`     http://localhost:${PORT}/api/strava`);
  console.log(`     http://localhost:${PORT}/api/instagram\n`);
  const missing = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_REFRESH_TOKEN', 'INSTAGRAM_SESSION_ID']
    .filter((k) => !process.env[k] || process.env[k].includes('your_'));
  if (missing.length) {
    console.warn(`⚠️   Falten variables al .env: ${missing.join(', ')}\n`);
  }
});
