// Shared Strava helpers for the serverless /api functions and the local dev API.
// No framework, no external deps; uses the global fetch() available in Node 18+.

export const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
export const CLUB_ID = 1576309;

/**
 * Refreshes a Strava access token using the long-lived refresh_token stored
 * in env vars. Throws if any of the env vars are missing or if Strava
 * rejects the exchange.
 */
export async function getAccessToken() {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } =
    process.env;
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
    // Avoid echoing the raw Strava error body to clients; keep enough for logs.
    throw new Error(`Strava token refresh failed: ${data.message ?? 'unknown'}`);
  }
  return data.access_token;
}

/**
 * Maps Strava's numeric (type, sub_type) tuple for a route to one of our
 * three high-level categories. Shared between the prod and dev handlers
 * so dev and prod always render the same chip.
 *
 *   type:  1 = ride, 2 = run, 3 = mixed, 5 = trail run
 *   sub_type: 1 = road, 2 = mountain bike, 3 = cross, 4 = trail, 5 = mixed
 */
export function mapStravaRouteType(type, subType) {
  if (subType === 4) return 'mountain';
  if (type === 2 && subType === 1) return 'road';
  if (type === 5) return 'mountain';
  if (type === 3) return 'mixed';
  return 'mixed';
}
