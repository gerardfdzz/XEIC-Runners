const CLUB_ID    = 1576309;
const TOKEN_URL  = 'https://www.strava.com/oauth/token';
const API_BASE   = 'https://www.strava.com/api/v3';
const CACHE_TTL  = 5 * 60 * 1000;

let _cache      = null;
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
  if (!data.access_token) {
    throw new Error(`Strava token refresh failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

exports.handler = async (event) => {
  const HEADERS = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'public, s-maxage=300, stale-while-revalidate=60',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  try {
    if (_cache && Date.now() < _cacheExpiry) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify(_cache) };
    }

    const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
      throw new Error('Falten variables d\'entorn de Strava. Comprova STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET i STRAVA_REFRESH_TOKEN.');
    }

    const accessToken = await getAccessToken();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const [clubRes, activitiesRes, groupEventsRes] = await Promise.all([
      fetch(`${API_BASE}/clubs/${CLUB_ID}`,                        { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/activities?per_page=30`, { headers: auth }),
      fetch(`${API_BASE}/clubs/${CLUB_ID}/group_events`,           { headers: auth }),
    ]);

    if (!clubRes.ok) {
      throw new Error(`Club API error: ${clubRes.status} ${await clubRes.text()}`);
    }
    if (!activitiesRes.ok) {
      throw new Error(`Activities API error: ${activitiesRes.status} ${await activitiesRes.text()}`);
    }

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

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(_cache) };

  } catch (err) {
    console.error('[strava function]', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
