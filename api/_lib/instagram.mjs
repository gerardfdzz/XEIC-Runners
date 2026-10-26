export const HIGHLIGHT_IDS = ['18071980868164936'];

const IG_ORIGIN = 'https://www.instagram.com';
const IG_APP_ID = '936619743392459';
const WEB_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Persisted GraphQL query used by instagram.com to load highlights
// (PolarisStoriesV3ReelPageGalleryQuery). Instagram rotates these ids: when it
// changes, override it with INSTAGRAM_HIGHLIGHT_DOC_ID instead of editing code.
const DEFAULT_HIGHLIGHT_DOC_ID = '29306733562261201';

function getHighlightDocId() {
  return process.env.INSTAGRAM_HIGHLIGHT_DOC_ID?.trim() || DEFAULT_HIGHLIGHT_DOC_ID;
}

function matchToken(html, patterns) {
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function readCookie(res, name) {
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    const m = c.match(new RegExp(`^${name}=([^;]+)`));
    if (m) return m[1];
  }
  return null;
}

// The GraphQL endpoint requires the per-session tokens (fb_dtsg, lsd, csrftoken)
// that instagram.com embeds in its HTML, so a page is loaded first to read them.
async function fetchWebTokens(sessionId) {
  const res = await fetch(`${IG_ORIGIN}/`, {
    headers: {
      'User-Agent': WEB_USER_AGENT,
      Cookie: `sessionid=${sessionId}`,
      Accept: 'text/html',
      'Accept-Language': 'ca-ES,ca;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`Instagram page responded ${res.status}`);
  }
  const html = await res.text();

  const dtsg = matchToken(html, [
    /"DTSGInitialData",\[\],\{"token":"([^"]+)"/,
    /"dtsg":\{"token":"([^"]+)"/,
  ]);
  const lsd = matchToken(html, [/"LSD",\[\],\{"token":"([^"]+)"/]);
  const csrf = readCookie(res, 'csrftoken') ?? matchToken(html, [/"csrf_token":"([^"]+)"/]);

  if (!dtsg || !lsd || !csrf) {
    throw new Error(
      `Instagram session not accepted (tokens: dtsg=${!!dtsg}, lsd=${!!lsd}, csrf=${!!csrf}): session expired?`,
    );
  }
  return { dtsg, lsd, csrf };
}

// Adapts the GraphQL connection to the legacy `{ reels: { 'highlight:<id>': reel } }`
// shape so the extraction helpers below stay unchanged.
function toReelsMap(connection) {
  const reels = {};
  (connection?.edges ?? []).forEach((edge, i) => {
    const node = edge?.node;
    if (!node) return;
    const rawId = String(node.id ?? HIGHLIGHT_IDS[i] ?? '');
    const key = rawId.startsWith('highlight:') ? rawId : `highlight:${rawId}`;
    reels[key] = node;
  });
  return { reels };
}

export async function fetchHighlightsData(sessionId) {
  const { dtsg, lsd, csrf } = await fetchWebTokens(sessionId);
  const reelIds = HIGHLIGHT_IDS.map((id) => `highlight:${id}`);
  const variables = {
    first: 100,
    initial_reel_id: reelIds[0],
    reel_ids: reelIds,
    __relay_internal__pv__PolarisCommunityNoteStoriesLabelEnabledrelayprovider: false,
  };

  const res = await fetch(`${IG_ORIGIN}/graphql/query`, {
    method: 'POST',
    headers: {
      'User-Agent': WEB_USER_AGENT,
      Cookie: `sessionid=${sessionId}; csrftoken=${csrf}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrf,
      'X-FB-LSD': lsd,
      'X-IG-App-ID': IG_APP_ID,
      Accept: '*/*',
      Origin: IG_ORIGIN,
      Referer: `${IG_ORIGIN}/stories/highlights/${HIGHLIGHT_IDS[0]}/`,
    },
    body: new URLSearchParams({
      fb_dtsg: dtsg,
      lsd,
      doc_id: getHighlightDocId(),
      variables: JSON.stringify(variables),
      fb_api_caller_class: 'RelayModern',
      server_timestamps: 'true',
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Instagram GraphQL responded ${res.status}: ${text.slice(0, 300)}`);
  }

  let json;
  try {
    json = JSON.parse(text.replace(/^for \(;;\);/, ''));
  } catch {
    throw new Error(
      `Instagram GraphQL returned non-JSON (doc_id outdated?): ${text.slice(0, 120)}`,
    );
  }
  if (json.errors?.length) {
    throw new Error(`Instagram GraphQL error: ${json.errors[0].message}`);
  }

  return toReelsMap(json.data?.xdt_api__v1__feed__reels_media__connection);
}

function getReelsMap(data) {
  return data?.reels ?? data?.reels_media ?? {};
}

// Instagram can answer 200 without the requested reel (session no longer valid or
// highlight removed), so a missing reel must be detected explicitly.
export function findMissingHighlights(data) {
  const reelsMap = getReelsMap(data);
  return HIGHLIGHT_IDS.filter((id) => !reelsMap[`highlight:${id}`]);
}

export function extractHighlightItems(data) {
  const reelsMap = getReelsMap(data);
  let items = [];
  for (const id of HIGHLIGHT_IDS) {
    const reel = reelsMap[`highlight:${id}`];
    if (!reel) continue;
    const reelItems = (reel.items ?? [])
      .map((item) => {
        const candidates = item.image_versions2?.candidates ?? [];
        const best = candidates.reduce((a, b) => (b.width > a.width ? b : a), candidates[0] ?? {});
        return {
          id: item.id,
          imageUrl: best.url ?? null,
          width: best.width ?? null,
          height: best.height ?? null,
          takenAt: item.taken_at,
        };
      })
      .filter((i) => i.imageUrl);
    items = items.concat(reelItems);
  }
  items.sort((a, b) => b.takenAt - a.takenAt);
  return items;
}

export function isInstagramEnabled() {
  const raw = (process.env.INSTAGRAM_ENABLED ?? 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no';
}
