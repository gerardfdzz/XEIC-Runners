# XEIC RUNNERS

Official website of the XEIC RUNNERS running club from La Sénia (Terres de l'Ebre, Catalonia). Built with Angular 17 standalone components, plain SCSS + BEM, and live integrations with Strava, Instagram, and Google Sheets.

## Tech stack

| Tool | Version | Purpose |
|---|---|---|
| Angular | 17.3 | Main framework (standalone components, `@for`/`@if` control flow) |
| TypeScript | 5.4 | Language |
| SCSS + BEM | — | Component styles (no Tailwind utilities at component level) |
| Angular Router | built-in | Lazy-loaded routes |
| RxJS | 7.8 | Async streams (`forkJoin`, `shareReplay`, `catchError`) |
| Netlify Functions | Node.js | Serverless API proxy (Strava + Instagram) |

---

## Quick start

```bash
npm install

# Angular dev server only (http://localhost:4200)
npm start

# Angular + API proxy (Strava & Instagram via localhost:3000)
npm run strava:api   # terminal 1 — starts the local API server
npm start            # terminal 2 — Angular with proxy.conf.json

# Production build
npm run build
```

---

## Environment variables

Copy `.env` and fill in your values:

```env
# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REFRESH_TOKEN=your_refresh_token   # obtained via npm run strava:auth

# Instagram
INSTAGRAM_SESSION_ID=your_session_id     # from DevTools → Cookies → instagram.com
```

For **Netlify deployment**, add these same variables under *Site settings → Environment variables*.

---

## API integrations

### Strava (serverless proxy)

The app never exposes Strava secrets to the browser. A Netlify serverless function (`netlify/functions/strava.js`) refreshes the OAuth token on each cold start, fetches the club data in parallel, and returns a single JSON:

```
GET /api/strava → { club, activities, groupEvents }
```

**What it fetches:**
- `/clubs/{id}` — member count, name, sport type
- `/clubs/{id}/activities?per_page=30` — recent member activities (shown in the Community page)
- `/clubs/{id}/group_events` — organised club events (shown in the Events page as upcoming)

**To obtain a refresh token:**
```bash
npm run strava:auth   # opens auth URL, paste the code, prints STRAVA_REFRESH_TOKEN
```

**Cache:** 5 minutes in-memory (serverless instance lifetime).

---

### Instagram highlights (serverless proxy)

`netlify/functions/instagram.js` fetches highlight stories from `@xeicrunners` using Instagram's private API. No official API key required — only a `sessionid` cookie from a logged-in browser session.

```
GET /api/instagram → { items: [{ id, imageUrl, takenAt }] }
```

**How to get the session ID:**
1. Open Chrome, log in as `@xeicrunners` at instagram.com
2. DevTools → Application → Cookies → `https://www.instagram.com`
3. Copy the value of `sessionid`
4. Add it to `.env` as `INSTAGRAM_SESSION_ID`

**Cache:** 30 minutes (Instagram CDN URLs expire after ~1 hour).

---

### Google Sheets mini-CMS

Past events with full metadata (title, date, distance, elevation, image, description) can be managed via a public Google Sheet — no backend needed.

**Sheet columns** (row 1 must be the exact header):

| title | date | time | location | type | difficulty | tags | imageUrl | distance | elevationGain | description | registrationUrl |
|---|---|---|---|---|---|---|---|---|---|---|---|

- `date` → `DD/MM/YYYY`
- `type` → `training` / `race` / `social` / `track`
- `difficulty` → `Iniciació` / `Mitjà` / `Xeic!`
- `tags` → pipe-separated: `Muntanya|Trail|Xeic!`
- `imageUrl` → direct URL (Google Drive, Cloudinary, any CDN)

**To activate:**
1. *File → Share → Publish to web → Sheet1 → CSV → Publish*
2. Copy the URL and set it in `src/app/core/services/events-sheet.service.ts`:
```ts
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/.../pub?output=csv';
```

---

## Data source priority (Events page)

| Section | Priority 1 | Priority 2 | Priority 3 |
|---|---|---|---|
| **Upcoming events** | Strava group events | Google Sheet (future rows) | Hardcoded local data |
| **Past events** | Instagram highlights | Google Sheet (past rows) | Hardcoded local data |

All sources are fetched in parallel with `forkJoin`. Any failure silently falls through to the next source.

---

## Project structure

```
xeic-runners/
├── netlify/
│   └── functions/
│       ├── strava.js          # Serverless: Strava OAuth + club data proxy
│       └── instagram.js       # Serverless: Instagram highlights proxy
│
├── scripts/
│   ├── dev-api.mjs            # Local API server (port 3000) — mirrors both functions
│   └── strava-auth.mjs        # Interactive OAuth flow → prints STRAVA_REFRESH_TOKEN
│
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   │   ├── event.model.ts         # XeicEvent, EventType, EventDifficulty
│   │   │   │   ├── instagram.model.ts     # InstagramItem, InstagramHighlightsResponse
│   │   │   │   ├── member.model.ts        # Member (founders & team)
│   │   │   │   ├── route.model.ts         # XeicRoute, RouteType, RouteDifficulty
│   │   │   │   └── strava.model.ts        # StravaClub, StravaActivity, StravaGroupEvent, StravaData
│   │   │   └── services/
│   │   │       ├── events-data.service.ts # Hardcoded fallback events
│   │   │       ├── events-sheet.service.ts# Google Sheets CSV → XeicEvent[]
│   │   │       ├── i18n.service.ts        # Translations CA/ES/EN (Signals)
│   │   │       ├── instagram.service.ts   # GET /api/instagram → InstagramItem[]
│   │   │       ├── routes-data.service.ts # Hardcoded routes data
│   │   │       └── strava.service.ts      # GET /api/strava → club, activities, groupEvents
│   │   │
│   │   ├── shared/
│   │   │   └── components/
│   │   │       ├── event-card/            # Event card with image, date badge, tags
│   │   │       ├── footer/                # Logo, tagline, social links
│   │   │       ├── mobile-nav/            # Fixed bottom bar (< md)
│   │   │       ├── navbar/                # Top nav with language selector
│   │   │       └── route-card/            # Route card with stats and Strava link
│   │   │
│   │   ├── features/
│   │   │   ├── home/                      # Hero · Founders · Events · Routes · Community · CTA
│   │   │   ├── fundadors/                 # History · Values bento · Team · CTA
│   │   │   ├── rutes/                     # Hero · Sticky filters · Responsive grid
│   │   │   ├── esdeveniments/             # Upcoming (Strava) + Past (Instagram/Sheet/local)
│   │   │   └── comunitat/                 # Stats (live) · Recent activities · Gallery · CTA
│   │   │
│   │   ├── app.component.ts               # Shell: Navbar + RouterOutlet + Footer + MobileNav
│   │   ├── app.config.ts                  # provideRouter + provideHttpClient
│   │   └── app.routes.ts                  # Lazy-loaded routes
│   │
│   ├── styles/
│   │   ├── _variables.scss                # Design tokens (colors, typography, spacing, shadows)
│   │   └── _mixins.scss                   # Layout helpers, typography mixins, responsive breakpoints
│   │
│   ├── assets/
│   │   └── i18n/
│   │       ├── ca.json                    # Catalan (primary language)
│   │       ├── es.json                    # Spanish
│   │       └── en.json                    # English
│   │
│   ├── index.html                         # SEO meta tags, OG, theme-color
│   └── styles.scss                        # Global resets + utility classes
│
├── proxy.conf.json                        # Dev proxy: /api/* → localhost:3000
├── netlify.toml                           # Build config + /api/* → function redirects
├── .env                                   # Local secrets (never committed)
└── tailwind.config.js                     # Present but unused at component level
```

---

## Routes

| Path | Component | Lazy |
|---|---|---|
| `/` | `HomeComponent` | ✅ |
| `/fundadors` | `FundadorsComponent` | ✅ |
| `/esdeveniments` | `EsdevenimentsComponent` | ✅ |
| `/rutes` | `RutesComponent` | ✅ |
| `/comunitat` | `ComunitatComponent` | ✅ |
| `/**` | redirect → `/` | — |

The router restores scroll to top on every navigation.

---

## Design system

Tokens are defined in `src/styles/_variables.scss` and consumed via `@use '../../../styles/variables' as *`. No Tailwind utilities are used inside components — all styles follow **BEM** naming.

**Colour palette:**
- Primary — `#904d00` (dark brown) / Container: `#ff8c00` (orange)
- Secondary — `#b80049` (magenta) / Container: `#e2165f` (pink)
- Tertiary — `#6a5f00` (olive)
- Background — `#faf9f6` (cream)

**Typography:**
- Headings / labels — **Lexend** (400–800)
- Body text — **Newsreader** (serif, with italic variant)
- Icons — **Material Symbols Outlined**

**Global utility classes** (`styles.scss`):

| Class | Description |
|---|---|
| `.grainy-gradient` | Brand gradient orange→pink with SVG noise texture |
| `.text-gradient` | Text clip with primary→secondary gradient |

---

## Internationalisation

`I18nService` uses **Angular Signals** for reactivity:

```typescript
i18n.t('nav.home')       // translate key
i18n.currentLang()       // signal: 'ca' | 'es' | 'en'
i18n.setLanguage('ca')   // persists to localStorage
```

- Browser language auto-detection (`navigator.language`)
- Persistence via `localStorage` (key: `xeic-lang`)
- Fallback to Catalan
- In-memory JSON cache (avoids repeated HTTP requests)
- Translation files: `src/assets/i18n/{ca,es,en}.json`

---

## npm scripts

| Script | Description |
|---|---|
| `npm start` | Angular dev server (`localhost:4200`) |
| `npm run build` | Production build → `dist/xeic-runners/browser` |
| `npm run strava:api` | Start local API server (`localhost:3000`) for Strava + Instagram |
| `npm run strava:auth` | Interactive Strava OAuth flow — prints `STRAVA_REFRESH_TOKEN` |
| `npm run start:netlify` | Netlify Dev (requires Netlify CLI) |

---

## Deployment (Netlify)

The project is pre-configured for Netlify via `netlify.toml`:

- **Build command:** `npm run build`
- **Publish dir:** `dist/xeic-runners/browser`
- **Functions dir:** `netlify/functions`
- `/api/strava` → `/.netlify/functions/strava`
- `/api/instagram` → `/.netlify/functions/instagram`
- `/*` → `index.html` (SPA fallback)

Add the following environment variables in *Netlify → Site settings → Environment variables*:

```
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REFRESH_TOKEN
INSTAGRAM_SESSION_ID
```

---

**Club on Strava:** [strava.com/clubs/1576309](https://www.strava.com/clubs/1576309)  
**Instagram:** [@xeicrunners](https://www.instagram.com/xeicrunners/)
