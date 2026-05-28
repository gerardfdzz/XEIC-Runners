import {
  STRAVA_API_BASE,
  getAccessToken,
  mapStravaRouteType,
} from './_lib/strava.mjs';

const CACHE_TTL = 15 * 60 * 1000;
let _cache = null;
let _cacheExpiry = 0;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return res.status(200).json(_cache);
    }

    const athleteId = process.env.STRAVA_ATHLETE_ID;
    if (!athleteId) throw new Error('Missing STRAVA_ATHLETE_ID env var.');

    const accessToken = await getAccessToken();
    const routesRes = await fetch(
      `${STRAVA_API_BASE}/athletes/${athleteId}/routes?per_page=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!routesRes.ok) {
      const body = await routesRes.text();
      throw new Error(
        `Strava routes responded ${routesRes.status}: ${body.slice(0, 200)}`,
      );
    }

    const raw = await routesRes.json();
    if (!Array.isArray(raw)) {
      throw new Error(
        `Unexpected Strava routes payload: ${JSON.stringify(raw).slice(0, 200)}`,
      );
    }

    const routes = raw
      .filter((r) => !r.private)
      .map((r) => ({
        id: r.id_str,
        name: r.name,
        description: r.description || null,
        distance: parseFloat((r.distance / 1000).toFixed(1)),
        elevationGain: Math.round(r.elevation_gain),
        estimatedTime: r.estimated_moving_time,
        type: mapStravaRouteType(r.type, r.sub_type),
        mapImageUrl: r.map_urls?.url ?? null,
        stravaUrl: `https://www.strava.com/routes/${r.id_str}`,
      }));

    _cache = { routes };
    _cacheExpiry = Date.now() + CACHE_TTL;

    return res.status(200).json(_cache);
  } catch (err) {
    console.error('[api/routes]', err.message);
    return res.status(500).json({ error: err.message, routes: [] });
  }
}
