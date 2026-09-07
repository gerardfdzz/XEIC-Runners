import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CLUB_ID,
  STRAVA_API_BASE,
  getAccessToken,
  mapStravaRouteType,
} from '../api/_lib/strava.mjs';
import {
  IG_API_URL,
  buildInstagramHeaders,
  extractHighlightItems,
  isInstagramEnabled,
} from '../api/_lib/instagram.mjs';

const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && !key.startsWith('#') && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
}

const PORT = 3000;
const STRAVA_TTL = 5 * 60 * 1000;
const ROUTES_TTL = 15 * 60 * 1000;
const IG_TTL = 30 * 60 * 1000;

let _strava = { data: null, expiry: 0 };
let _routes = { data: null, expiry: 0 };
let _ig = { data: null, expiry: 0 };

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const sendJson = (res, status, body) => {
  res.writeHead(status, HEADERS);
  res.end(JSON.stringify(body));
};

async function handleStrava(res) {
  try {
    if (_strava.data && Date.now() < _strava.expiry) {
      return sendJson(res, 200, _strava.data);
    }
    console.log('🔄  Refreshing Strava token...');
    const accessToken = await getAccessToken();
    const auth = { Authorization: `Bearer ${accessToken}` };

    console.log('📡  Fetching club + activities + group events...');
    const [clubRes, activitiesRes, groupEventsRes] = await Promise.all([
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}`, { headers: auth }),
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}/activities?per_page=30`, {
        headers: auth,
      }),
      fetch(`${STRAVA_API_BASE}/clubs/${CLUB_ID}/group_events`, {
        headers: auth,
      }),
    ]);

    if (!clubRes.ok) {
      const body = await clubRes.text();
      throw new Error(`Club API: ${clubRes.status} — ${body.slice(0, 300)}`);
    }
    if (!activitiesRes.ok) {
      const body = await activitiesRes.text();
      throw new Error(`Activities API: ${activitiesRes.status} — ${body.slice(0, 300)}`);
    }

    const [club, activities, groupEvents] = await Promise.all([
      clubRes.json(),
      activitiesRes.json(),
      groupEventsRes.ok ? groupEventsRes.json() : Promise.resolve([]),
    ]);

    _strava = {
      data: {
        club,
        activities,
        groupEvents: Array.isArray(groupEvents) ? groupEvents : [],
      },
      expiry: Date.now() + STRAVA_TTL,
    };
    console.log(
      `✅  Club: ${club.name} · ${club.member_count} membres · ${activities.length} activitats · ${_strava.data.groupEvents.length} events`,
    );
    sendJson(res, 200, _strava.data);
  } catch (err) {
    console.error('❌ ', err.message);
    sendJson(res, 500, { error: err.message });
  }
}

async function handleRoutes(res) {
  try {
    if (_routes.data && Date.now() < _routes.expiry) {
      return sendJson(res, 200, _routes.data);
    }
    const athleteId = process.env.STRAVA_ATHLETE_ID;
    if (!athleteId) throw new Error('Falta STRAVA_ATHLETE_ID al .env');

    console.log('🗺️  Fetching Strava routes...');
    const accessToken = await getAccessToken();
    const routesRes = await fetch(`${STRAVA_API_BASE}/athletes/${athleteId}/routes?per_page=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!routesRes.ok) {
      const body = await routesRes.text();
      throw new Error(`Strava routes HTTP ${routesRes.status}: ${body.slice(0, 200)}`);
    }
    const raw = await routesRes.json();
    if (!Array.isArray(raw)) {
      throw new Error(`Unexpected Strava routes payload: ${JSON.stringify(raw).slice(0, 200)}`);
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

    _routes = { data: { routes }, expiry: Date.now() + ROUTES_TTL };
    console.log(`✅  Routes: ${routes.length} rutes`);
    sendJson(res, 200, _routes.data);
  } catch (err) {
    console.error('❌  Routes:', err.message);
    sendJson(res, 500, { error: err.message, routes: [] });
  }
}

async function handleInstagram(res) {
  if (!isInstagramEnabled()) {
    return sendJson(res, 200, { items: [], disabled: true });
  }
  try {
    if (_ig.data && Date.now() < _ig.expiry) {
      return sendJson(res, 200, _ig.data);
    }
    const rawSession = process.env.INSTAGRAM_SESSION_ID;
    if (!rawSession || rawSession.includes('your_')) {
      throw new Error('Falta INSTAGRAM_SESSION_ID al .env');
    }
    const sessionId = decodeURIComponent(rawSession);

    console.log('📸  Fetching Instagram highlights...');
    const igRes = await fetch(IG_API_URL, {
      headers: buildInstagramHeaders(sessionId),
    });
    if (!igRes.ok) {
      const body = await igRes.text();
      throw new Error(`Instagram HTTP ${igRes.status}: ${body.slice(0, 300)}`);
    }
    const data = await igRes.json();
    const items = extractHighlightItems(data);

    _ig = { data: { items }, expiry: Date.now() + IG_TTL };
    console.log(`✅  Instagram: ${items.length} highlights`);
    sendJson(res, 200, _ig.data);
  } catch (err) {
    console.error('❌  Instagram:', err.message);
    sendJson(res, 500, { error: err.message, items: [] });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, HEADERS);
    res.end();
    return;
  }

  if (req.url.startsWith('/api/strava')) return handleStrava(res);
  if (req.url.startsWith('/api/routes')) return handleRoutes(res);
  if (req.url.startsWith('/api/instagram')) return handleInstagram(res);

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n🚀  Dev API running at:`);
  console.log(`     http://localhost:${PORT}/api/strava`);
  console.log(`     http://localhost:${PORT}/api/instagram`);
  console.log(`     http://localhost:${PORT}/api/routes\n`);
  const missing = [
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
    'STRAVA_REFRESH_TOKEN',
    'STRAVA_ATHLETE_ID',
    'INSTAGRAM_SESSION_ID',
  ].filter((k) => !process.env[k] || process.env[k].includes('your_'));
  if (missing.length) {
    console.warn(`⚠️   Falten variables al .env: ${missing.join(', ')}\n`);
  }
  if (!isInstagramEnabled()) {
    console.warn('ℹ️   INSTAGRAM_ENABLED=false — IG endpoint serves an empty list.\n');
  }
});
