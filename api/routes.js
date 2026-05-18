const TOKEN_URL = 'https://www.strava.com/oauth/token';
const API_BASE  = 'https://www.strava.com/api/v3';
const CACHE_TTL = 15 * 60 * 1000;

let _cache       = null;
let _cacheExpiry = 0;

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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return res.status(200).json(_cache);
    }

    const athleteId = process.env.STRAVA_ATHLETE_ID;
    if (!athleteId) throw new Error('Missing STRAVA_ATHLETE_ID environment variable.');

    const accessToken = await getAccessToken();
    const routesRes = await fetch(
      `${API_BASE}/athletes/${athleteId}/routes?per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!routesRes.ok) {
      const body = await routesRes.text();
      throw new Error(`Strava routes responded ${routesRes.status}: ${body.slice(0, 200)}`);
    }

    const raw = await routesRes.json();

    const routes = raw
      .filter((r) => !r.private)
      .map((r) => ({
        id:            r.id_str,
        name:          r.name,
        description:   r.description || null,
        distance:      parseFloat((r.distance / 1000).toFixed(1)),
        elevationGain: Math.round(r.elevation_gain),
        estimatedTime: r.estimated_moving_time,
        type:          mapType(r.type, r.sub_type),
        mapImageUrl:   r.map_urls?.url ?? null,
        stravaUrl:     `https://www.strava.com/routes/${r.id_str}`,
      }));

    _cache       = { routes };
    _cacheExpiry = Date.now() + CACHE_TTL;

    return res.status(200).json(_cache);

  } catch (err) {
    console.error('[api/routes]', err.message);
    return res.status(500).json({ error: err.message, routes: [] });
  }
};

function mapType(type, subType) {
  if (subType === 4) return 'mountain';
  if (type === 2 && subType === 1) return 'road';
  if (type === 5) return 'mountain';
  if (type === 3) return 'mixed';
  return 'mixed';
}
