import { CLUB_ID, STRAVA_API_BASE, getAccessToken } from './_lib/strava.mjs';

const CACHE_TTL = 5 * 60 * 1000;
let _cache = null;
let _cacheExpiry = 0;

export default async function handler(req, res) {
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

    const accessToken = await getAccessToken();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const [clubRes, activitiesRes, groupEventsRes] = await Promise.all([
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}`, { headers: auth }),
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}/activities?per_page=30`, {
        headers: auth,
      }),
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}/group_events`, {
        headers: auth,
      }),
    ]);

    if (!clubRes.ok) throw new Error(`Club API: ${clubRes.status}`);
    if (!activitiesRes.ok) {
      console.error(
        `[api/strava] Activities API: ${activitiesRes.status} — continuing with empty list`,
      );
    }

    const [club, activities, groupEvents] = await Promise.all([
      clubRes.json(),
      activitiesRes.ok ? activitiesRes.json() : Promise.resolve([]),
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
}
