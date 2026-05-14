# XEIC RUNNERS

Official website of the XEIC RUNNERS running club from La Sénia (Terres de l'Ebre, Catalonia). Built with Angular 17 standalone components, plain SCSS + BEM, and live integrations with Strava, Instagram, and Google Sheets. Deployed on Vercel.

## Tech stack

| Tool | Version | Purpose |
|---|---|---|
| Angular | 17.3 | Main framework (standalone components, `@for`/`@if` control flow) |
| TypeScript | 5.4 | Language |
| SCSS + BEM | — | Component styles |
| Angular Router | built-in | Lazy-loaded routes |
| RxJS | 7.8 | Async streams (`forkJoin`, `shareReplay`, `catchError`) |
| Vercel Functions | Node.js | Serverless API proxy (Strava + Instagram) |

---

## Quick start

```bash
npm install

# Angular dev server only — http://localhost:4200
npm start

# Angular + live API (Strava & Instagram)
npm run strava:api   # terminal 1 — local API server on localhost:3000
npm start            # terminal 2 — Angular reads proxy.conf.json → localhost:3000

# Production build
npm run build
```

---

## Environment variables

Create a `.env` file at the project root:

```env
# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REFRESH_TOKEN=your_refresh_token   # obtained via: npm run strava:auth

# Instagram
INSTAGRAM_SESSION_ID=your_session_id     # from browser DevTools → Cookies → instagram.com
```

For **Vercel deployment**, add the same keys under *Project → Settings → Environment Variables*.

---

## API integrations

### Strava (Vercel serverless function)

`api/strava.js` refreshes the OAuth token on each cold start, fetches club data in parallel, and returns a single cached JSON response.

```
GET /api/strava → { club, activities, groupEvents }
```

**Endpoints fetched from Strava:**
- `/clubs/{id}` — member count, name, sport type
- `/clubs/{id}/activities?per_page=30` — recent member activities (Community page)
- `/clubs/{id}/group_events` — organised club events (Events page, upcoming section)

**To get a refresh token:**
```bash
npm run strava:auth   # follow the prompts → prints STRAVA_REFRESH_TOKEN
```

**Cache:** 5 minutes in-memory.

---

### Instagram highlights (Vercel serverless function)

`api/instagram.js` fetches highlight stories from `@xeicrunners` using Instagram's private API. Requires only a `sessionid` cookie — no official API key.

```
GET /api/instagram → { items: [{ id, imageUrl, takenAt }] }
```

**How to get the session ID:**
1. Open Chrome, log in as `@xeicrunners` at instagram.com
2. DevTools → Application → Cookies → `https://www.instagram.com`
3. Copy the value of `sessionid` → set as `INSTAGRAM_SESSION_ID`

**Cache:** 30 minutes (Instagram CDN URLs expire after ~1 hour).

---

### Google Sheets mini-CMS

Past events with full metadata (title, date, distance, elevation, photo, description) can be managed via a public Google Sheet — no backend or API key needed.

**Sheet columns** (row 1 = exact header names):

| title | date | time | location | type | difficulty | tags | imageUrl | distance | elevationGain | description | registrationUrl |
|---|---|---|---|---|---|---|---|---|---|---|---|

- `date` → `DD/MM/YYYY`
- `type` → `training` / `race` / `social` / `track`
- `difficulty` → `Iniciació` / `Mitjà` / `Xeic!`
- `tags` → pipe-separated: `Muntanya|Trail|Xeic!`
- `imageUrl` → direct image URL (any CDN)

**To activate:**
1. *File → Share → Publish to web → Sheet1 → CSV → Publish*
2. Paste the URL in `src/app/core/services/events-sheet.service.ts`:
```ts
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/.../pub?output=csv';
```

---

## Data source priority (Events page)

All sources are fetched in parallel with `forkJoin`. Any failure silently falls through to the next source.

| Section | Priority 1 | Priority 2 | Priority 3 |
|---|---|---|---|
| **Upcoming** | Strava group events | Google Sheet (future rows) | Hardcoded local data |
| **Past** | Instagram highlights | Google Sheet (past rows) | Hardcoded local data |

---

## Project structure

```
xeic-runners/
├── api/
│   ├── strava.js              # Vercel function: Strava OAuth + club data proxy
│   └── instagram.js           # Vercel function: Instagram highlights proxy
│
├── scripts/
│   ├── dev-api.mjs            # Local API server (port 3000) — mirrors api/ functions
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
│   │   │   │   └── strava.model.ts        # StravaClub, StravaActivity, StravaGroupEvent
│   │   │   └── services/
│   │   │       ├── events-data.service.ts # Hardcoded fallback events
│   │   │       ├── events-sheet.service.ts# Google Sheets CSV → XeicEvent[]
│   │   │       ├── i18n.service.ts        # Translations CA/ES/EN (Angular Signals)
│   │   │       ├── instagram.service.ts   # GET /api/instagram → InstagramItem[]
│   │   │       ├── routes-data.service.ts # Hardcoded routes data
│   │   │       └── strava.service.ts      # GET /api/strava → club, activities, groupEvents
│   │   │
│   │   ├── shared/
│   │   │   └── components/
│   │   │       ├── event-card/            # Event card: image, date badge, tags
│   │   │       ├── footer/                # Logo, tagline, social links
│   │   │       ├── mobile-nav/            # Fixed bottom bar (< md breakpoint)
│   │   │       ├── navbar/                # Top nav with language selector
│   │   │       └── route-card/            # Route card with stats and Strava link
│   │   │
│   │   ├── features/
│   │   │   ├── home/                      # Hero · Founders · Events · Routes · Community · CTA
│   │   │   ├── fundadors/                 # History · Values bento · Team · CTA
│   │   │   ├── rutes/                     # Hero · Sticky filters · Responsive grid
│   │   │   ├── esdeveniments/             # Upcoming (Strava) · Past (Instagram/Sheet/local)
│   │   │   └── comunitat/                 # Live stats · Recent activities · Gallery · CTA
│   │   │
│   │   ├── app.component.ts               # Shell: Navbar + RouterOutlet + Footer + MobileNav
│   │   ├── app.config.ts                  # provideRouter + provideHttpClient
│   │   └── app.routes.ts                  # Lazy-loaded routes
│   │
│   ├── styles/
│   │   ├── _variables.scss                # Design tokens (colours, typography, spacing)
│   │   └── _mixins.scss                   # Layout helpers, typography mixins, breakpoints
│   │
│   ├── assets/
│   │   ├── images/
│   │   │   ├── xeicrunners.png            # Club logo (also used as favicon)
│   │   │   └── fundadors/                 # Founders photos
│   │   └── i18n/
│   │       ├── ca.json                    # Catalan (primary language)
│   │       ├── es.json                    # Spanish
│   │       └── en.json                    # English
│   │
│   ├── index.html                         # SEO meta, OG tags, favicon
│   └── styles.scss                        # Global resets + utility classes
│
├── proxy.conf.json                        # Dev proxy: /api/* → localhost:3000
├── vercel.json                            # Build config + SPA rewrite fallback
└── .env                                   # Local secrets (git-ignored)
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

Tokens are defined in `src/styles/_variables.scss` and consumed via `@use '../../../styles/variables' as *`. All component styles follow **BEM** naming.

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
i18n.t('nav.home')       // translate a key
i18n.currentLang()       // signal: 'ca' | 'es' | 'en'
i18n.setLanguage('ca')   // persists to localStorage
```

- Browser language auto-detection (`navigator.language`)
- Fallback to Catalan
- In-memory JSON cache to avoid repeated HTTP requests
- Translation files: `src/assets/i18n/{ca,es,en}.json`

---

## npm scripts

| Script | Description |
|---|---|
| `npm start` | Angular dev server (`localhost:4200`) |
| `npm run build` | Production build → `dist/xeic-runners/browser` |
| `npm run strava:api` | Local API server (`localhost:3000`) — mirrors Vercel functions |
| `npm run strava:auth` | Interactive Strava OAuth → prints `STRAVA_REFRESH_TOKEN` |

---

## Deployment (Vercel)

The project is pre-configured for Vercel via `vercel.json`:

- **Build command:** `npm run build`
- **Output directory:** `dist/xeic-runners/browser`
- **Serverless functions:** `api/strava.js`, `api/instagram.js` (auto-detected)
- **SPA fallback:** all routes → `index.html`

**Steps:**
1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, `INSTAGRAM_SESSION_ID`
4. Deploy
5. Connect your domain: *Project → Settings → Domains*

---

**Strava club:** [strava.com/clubs/1576309](https://www.strava.com/clubs/1576309)  
**Instagram:** [@xeicrunners](https://www.instagram.com/xeicrunners/)
