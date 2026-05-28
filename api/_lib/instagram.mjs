// Shared Instagram (private highlight API) helpers.
// Both the production handler and the local dev API consume these so the
// scraping shape stays in one place — if/when Meta breaks the endpoint, this
// is the only file that needs to change.

export const HIGHLIGHT_IDS = ['18071980868164936'];

export const IG_API_URL = `https://i.instagram.com/api/v1/feed/reels_media/?${HIGHLIGHT_IDS.map(
  (id) => `reel_ids=highlight:${id}`,
).join('&')}`;

/** Headers required by Instagram's private highlight endpoint, copied from
 *  what a logged-in mobile Safari sends. The `sessionid` cookie comes from
 *  the INSTAGRAM_SESSION_ID env var and is injected per-request. */
export function buildInstagramHeaders(sessionId) {
  return {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    Cookie: `sessionid=${sessionId}`,
    'X-IG-App-ID': '936619743392459',
    Accept: '*/*',
    'Accept-Language': 'ca-ES,ca;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    Origin: 'https://www.instagram.com',
    Referer: 'https://www.instagram.com/',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Dest': 'empty',
    'X-Requested-With': 'XMLHttpRequest',
  };
}

/**
 * Extracts the displayable items from a `reels_media` response.
 * Pure function, no I/O. Used by both prod and dev handlers.
 */
export function extractHighlightItems(data) {
  const reelsMap = data?.reels ?? data?.reels_media ?? {};
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

/** Whether the Instagram integration is enabled in the current deployment.
 *  Default: enabled. Set INSTAGRAM_ENABLED=false to disable without redeploying
 *  code (e.g. when Meta breaks the private endpoint). */
export function isInstagramEnabled() {
  const raw = (process.env.INSTAGRAM_ENABLED ?? 'true').toLowerCase().trim();
  return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no';
}
