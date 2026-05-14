/**
 * Vercel serverless function — Strava proxy
 * GET /api/strava → { club, activities, groupEvents }
 *
 * Required environment variables (Vercel → Settings → Environment Variables):
 *   STRAVA_CLIENT_ID
 *   STRAVA_CLIENT_SECRET
 *   STRAVA_REFRESH_TOKEN
 */

const CLUB_ID   = 1576309;
const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_BASE  = 'https://www.strava.com/api/v3';
const CACHE_TTL = 5 * 60 * 1000; // 5 min

let _cache       = null;
let _cacheExpiry = 0;

async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Strava token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return res.status(200).json(_cache);
    }

    const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
      throw new Error('Missing Strava environment variables.');
    }

    const accessToken = await getAccessToken();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const [clubRes, activitiesRes, groupEventsRes] = await Promise.all([
      fetch(`${API_BASE}/clubs/${CLUB_ID}`,                        { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/activities?per_page=30`, { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/group_events`,           { headers: auth }),
    ]);

    if (!clubRes.ok)       throw new Error(`Club API: ${clubRes.status}`);
    if (!activitiesRes.ok) throw new Error(`Activities API: ${activitiesRes.status}`);

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

    return res.status(200).json(_cache);

  } catch (err) {
    console.error('[api/strava]', err.message);
    return res.status(500).json({ error: err.message });
  }
};
