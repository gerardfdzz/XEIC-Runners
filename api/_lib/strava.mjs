export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
export const CLUB_ID = 1576309;

export async function getAccessToken() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    throw new Error('Missing Strava environment variables.');
  }

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`Strava token refresh failed: ${data.message ?? 'unknown'}`);
  }
  return data.access_token;
}

export function mapStravaRouteType(type, subType) {
  if (subType === 4) return 'mountain';
  if (type === 2 && subType === 1) return 'road';
  if (type === 5) return 'mountain';
  if (type === 3) return 'mixed';
  return 'mixed';
}
