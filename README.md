# XEIC RUNNERS

Official website of the XEIC RUNNERS running club from La Sénia (Terres de l'Ebre, Catalonia). Built with Angular 17 standalone components, plain SCSS + BEM, and live integrations with Strava, Instagram, and Google Sheets. Deployed on Vercel.

## Tech stack

| Tool             | Version  | Purpose                                                           |
| ---------------- | -------- | ----------------------------------------------------------------- |
| Angular          | 17.3     | Main framework (standalone components, `@for`/`@if` control flow) |
| TypeScript       | 5.4      | Language                                                          |
| SCSS + BEM       | —        | Component styles                                                  |
| Angular Router   | built-in | Lazy-loaded routes                                                |
| RxJS             | 7.8      | Async streams (`forkJoin`, `shareReplay`, `catchError`)           |
| Vercel Functions | Node.js  | Serverless API proxy (Strava + Instagram + Routes)                |
| @vercel/analytics | —       | Page views and visitor tracking (privacy-friendly, no cookies)    |
| @vercel/speed-insights | —  | Core Web Vitals monitoring (LCP, FID, CLS) per page              |

---

## Quick start

```bash
npm install

# Angular dev server only — http://localhost:4200
npm start

# Angular + live API (Strava, Instagram & Routes)
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
STRAVA_ATHLETE_ID=your_athlete_id         # numeric ID from strava.com/athletes/{id}

# Instagram
INSTAGRAM_SESSION_ID=your_session_id     # from browser DevTools → Cookies → instagram.com
```

For **Vercel deployment**, add the same keys under _Project → Settings → Environment Variables_.

---

## API integrations

### Strava club data

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

### Strava routes

`api/routes.js` fetches the athlete's public routes from their Strava profile.

```
GET /api/routes → { routes: XeicRoute[] }
```

**Endpoint fetched from Strava:**

- `/athletes/{STRAVA_ATHLETE_ID}/routes?per_page=50` — all public routes

Each route is normalized to:

```ts
{
  id: string;
  name: string;
  description: string | null;
  distance: number;
  elevationGain: number;
  estimatedTime: number;
  type: 'mountain' | 'road' | 'mixed';
  mapImageUrl: string | null;
  stravaUrl: string;
}
```

Route type is inferred from Strava's `type` + `sub_type` fields:

| Strava sub_type | Strava type | Result     |
| --------------- | ----------- | ---------- |
| 4 (mountain)    | any         | `mountain` |
| 1 (road)        | 2 (run)     | `road`     |
| —               | 3 (walk)    | `mixed`    |
| other           | —           | `mixed`    |

**Cache:** 1 hour in-memory.

---

### Instagram highlights

`api/instagram.js` fetches highlight stories from `@xeicrunners` using Instagram's private API. Requires only a `sessionid` cookie — no official API key.

```
GET /api/instagram → { items: [{ id, imageUrl, takenAt }] }
```

**How to get the session ID:**

1. Open Chrome, log in as `@xeicrunners` at instagram.com
2. DevTools → Application → Cookies → `https://www.instagram.com`
3. Copy the value of `sessionid` → set as `INSTAGRAM_SESSION_ID`

> If the value contains `%3A`, paste it as-is — the server decodes it automatically.

**Cache:** 30 minutes (Instagram CDN URLs expire after ~1 hour).

---

### Google Sheets mini-CMS

Past events with full metadata (title, date, distance, elevation, photo, description) can be managed via a public Google Sheet — no backend or API key needed.

**Sheet columns** (row 1 = exact header names):

| title | date | time | location | type | difficulty | tags | imageUrl | distance | elevationGain | description | registrationUrl |
| ----- | ---- | ---- | -------- | ---- | ---------- | ---- | -------- | -------- | ------------- | ----------- | --------------- |

- `date` → `DD/MM/YYYY`
- `type` → `training` / `race` / `social` / `track`
- `difficulty` → `Iniciació` / `Mitjà` / `Xeic!`
- `tags` → pipe-separated: `Muntanya|Trail|Xeic!`
- `imageUrl` → direct public image URL

**Recommended image hosting: [ImgBB](https://imgbb.com)** (free, no account needed)  
Upload the photo → copy the **Direct link** (`https://i.ibb.co/...`) → paste into the Sheet.

**How each row works:**  
Each row in the Sheet serves two purposes simultaneously:

- **Past events** — if the row's `date` is strictly before today, it appears in the "Sortides passades" section with the photo, tags, and description from the Sheet.
- **Upcoming event image** — if a Strava group event has the **exact same title** as a row in the Sheet (case-insensitive), the app uses that row's `imageUrl` and `description` for the upcoming event card. The `date` must be set to the actual event date so that on the day after the event it automatically moves to "Sortides passades".

**Example workflow for an event:**
1. Add a row to the Sheet with the exact Strava title (e.g. `Trail XEIC + AREA`), the event date, photo URL and tags.
2. While the date is today or in the future → the photo appears on the Strava event card in "Pròxims esdeveniments".
3. The day after the event → the same row automatically moves to "Sortides passades".

**To activate:**

1. _File → Share → Publish to web → Sheet1 → CSV → Publish_
2. Paste the URL in `src/app/core/services/events-sheet.service.ts`:

```ts
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/.../pub?output=csv";
```

---

## Data source priority (Events page)

All sources are fetched in parallel with `forkJoin`. Any failure silently falls through to the next source.

| Section      | Priority 1           | Priority 2                 |
| ------------ | -------------------- | -------------------------- |
| **Upcoming** | Strava group events  | Google Sheet (future rows) |
| **Past**     | Instagram highlights | Google Sheet (past rows)   |

---

## Live dynamic stats

Member count and route count are never hardcoded — they are always fetched live from Strava:

| Stat           | Source                                  | Shown on                          |
| -------------- | --------------------------------------- | --------------------------------- |
| Member count   | `club.member_count` from `/api/strava`  | Home hero, Community page, Founders page |
| Route count    | Route array length from `/api/routes`   | Home hero, Community stats        |

Both show `...` while loading and fall back gracefully if the API is unavailable.

---

## SEO

### Per-page dynamic meta tags

`SeoService` (Angular `Meta` + `Title` services) updates all relevant tags on every route change:

```ts
this.seo.update({
  title: 'Page title · XEIC RUNNERS',
  description: '...',
  keywords: '...',
  ogImage: 'https://www.xeicrunners.com/assets/images/galeria/foto-xeic.jpg',
});
```

Tags updated per page: `<title>`, `description`, `keywords`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:title`, `twitter:description`, `twitter:image`, `link[rel=canonical]`.

### Static SEO files

| File              | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `src/robots.txt`  | `Allow: /` + `Sitemap:` pointer              |
| `src/sitemap.xml` | 5 URLs with priorities and weekly changefreq |

Both are listed in `angular.json` assets so they are copied to the build output root.

### Structured data (JSON-LD)

`src/index.html` includes two inline JSON-LD blocks:

- `SportsClub` — name, description, foundingDate, address, geo, sameAs (Strava + Instagram), contactPoint (WhatsApp)
- `WebSite` — name, url

### Security & cache headers (`vercel.json`)

| Header                    | Value                     |
| ------------------------- | ------------------------- |
| `X-Content-Type-Options`  | `nosniff`                 |
| `X-Frame-Options`         | `DENY`                    |
| `X-XSS-Protection`        | `1; mode=block`           |
| `Referrer-Policy`         | `strict-origin-when-cross-origin` |
| Static assets (`/_next/static/*`, `*.js`, `*.css`) | `Cache-Control: public, max-age=31536000, immutable` |
| `sitemap.xml` / `robots.txt` | `Cache-Control: public, max-age=86400` |

---

## Project structure

```
xeic-runners/
├── api/
│   ├── strava.js              # Vercel function: Strava OAuth + club data proxy
│   ├── instagram.js           # Vercel function: Instagram highlights proxy
│   └── routes.js              # Vercel function: athlete's public routes
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
│   │   │   │   ├── route.model.ts         # XeicRoute, RouteType
│   │   │   │   └── strava.model.ts        # StravaActivity, StravaGroupEvent, StravaData
│   │   │   └── services/
│   │   │       ├── events-sheet.service.ts  # Google Sheets CSV → XeicEvent[]
│   │   │       ├── i18n.service.ts          # Translations CA/ES/EN (Angular Signals)
│   │   │       ├── instagram.service.ts     # GET /api/instagram → InstagramItem[]
│   │   │       ├── seo.service.ts           # Dynamic meta tags + canonical per page
│   │   │       ├── strava.service.ts        # GET /api/strava → activities, groupEvents
│   │   │       └── strava-routes.service.ts # GET /api/routes → XeicRoute[]
│   │   │
│   │   ├── shared/
│   │   │   └── components/
│   │   │       ├── event-card/            # Event card: image, date badge, tags
│   │   │       ├── footer/                # Logo, tagline, social links
│   │   │       ├── mobile-nav/            # Fixed bottom bar (< md breakpoint)
│   │   │       ├── navbar/                # Top nav with language selector + WhatsApp CTA
│   │   │       └── route-card/            # Route card with stats and Strava link
│   │   │
│   │   ├── features/
│   │   │   ├── home/                      # Hero · Founders · Events · Routes · Community · CTA
│   │   │   ├── fundadors/                 # History · Values bento · Team · CTA
│   │   │   ├── rutes/                     # Hero · Sticky filters · Responsive grid
│   │   │   ├── esdeveniments/             # Upcoming (Strava) · Past (Instagram/Sheet)
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
│   │   │   ├── xeicrunners.png            # Club logo (hero image)
│   │   │   ├── favicon-circle.png         # 512×512 circular favicon (browser tab)
│   │   │   ├── apple-touch-icon.png       # 180×180 circular icon (iOS/Android home screen)
│   │   │   ├── strava-icon.png            # Strava branding icon
│   │   │   ├── fundadors/                 # Founders photos (Teo, Robert, Jordi, Saber)
│   │   │   └── galeria/                   # Club photos (used in galleries + OG images)
│   │   │       ├── foto-xeic.jpg          # Club members walking through La Sénia streets
│   │   │       ├── foto-grup.jpg          # Group photo at the river
│   │   │       ├── foto-rutes.jpg         # Landscape: lake at Parc Natural dels Ports
│   │   │       ├── foto-trail-1.jpg       # Trail running through mountain forest
│   │   │       └── foto-trail-2.jpg       # Runners on rocky viewpoint, Els Ports
│   │   └── i18n/
│   │       ├── ca.json                    # Catalan (primary language)
│   │       ├── es.json                    # Spanish
│   │       └── en.json                    # English
│   │
│   ├── favicon.ico                        # 3-size circular ICO (16×16, 32×32, 48×48) — replaces Angular default
│   ├── index.html                         # Base SEO meta, OG tags, JSON-LD, favicon
│   ├── robots.txt                         # Search engine directives + sitemap pointer
│   ├── sitemap.xml                        # 5 URLs with priorities (weekly changefreq)
│   └── styles.scss                        # Global resets + utility classes
│
├── proxy.conf.json                        # Dev proxy: /api/* → localhost:3000
├── vercel.json                            # Build config + SPA fallback + security headers
└── .env                                   # Local secrets (git-ignored)
```

---

## Routes

| Path             | Component                | Lazy |
| ---------------- | ------------------------ | ---- |
| `/`              | `HomeComponent`          | ✅   |
| `/fundadors`     | `FundadorsComponent`     | ✅   |
| `/esdeveniments` | `EsdevenimentsComponent` | ✅   |
| `/rutes`         | `RutesComponent`         | ✅   |
| `/comunitat`     | `ComunitatComponent`     | ✅   |
| `/**`            | redirect → `/`           | —    |

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

**Animation system** (`_variables.scss`):

Custom easing curves are defined as SCSS variables and used across all components:

| Variable      | Curve                          | Used for                              |
| ------------- | ------------------------------ | ------------------------------------- |
| `$ease-out`   | `cubic-bezier(0.23, 1, 0.32, 1)` | Entrances, hover responses, presses |
| `$ease-in-out`| `cubic-bezier(0.77, 0, 0.175, 1)`| On-screen movement (rotations)     |

Rules applied consistently across all components:
- All transitions specify exact properties — never `transition: all`
- Hover scale/transform effects are guarded with `@media (hover: hover) and (pointer: fine)` to prevent false triggers on touch devices
- Every pressable element has `&:active { transform: scale(0.97); }`
- Lang dropdown entrance uses `@starting-style` for a native CSS animate-in (no JS needed)
- `prefers-reduced-motion` global rule in `styles.scss` — respects user accessibility preferences

**Global utility classes** (`styles.scss`):

| Class              | Description                                       |
| ------------------ | ------------------------------------------------- |
| `.grainy-gradient` | Brand gradient orange→pink with SVG noise texture |
| `.text-gradient`   | Text clip with primary→secondary gradient         |

---

## Internationalisation

`I18nService` uses **Angular Signals** for reactivity:

```typescript
i18n.t("nav.home");
i18n.currentLang();
i18n.setLanguage("ca");
```

- Browser language auto-detection (`navigator.language`)
- Fallback to Catalan
- In-memory JSON cache to avoid repeated HTTP requests
- Translation files: `src/assets/i18n/{ca,es,en}.json`

---

## npm scripts

| Script                | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `npm start`           | Angular dev server (`localhost:4200`)                          |
| `npm run build`       | Production build → `dist/xeic-runners/browser`                 |
| `npm run strava:api`  | Local API server (`localhost:3000`) — mirrors Vercel functions |
| `npm run strava:auth` | Interactive Strava OAuth → prints `STRAVA_REFRESH_TOKEN`       |

---

## Deployment (Vercel)

The project is pre-configured for Vercel via `vercel.json`:

- **Build command:** `npm run build`
- **Output directory:** `dist/xeic-runners/browser`
- **Serverless functions:** `api/strava.js`, `api/instagram.js`, `api/routes.js` (auto-detected)
- **SPA fallback:** all routes → `index.html`

**Steps:**

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, `STRAVA_ATHLETE_ID`, `INSTAGRAM_SESSION_ID`
4. Deploy
5. Connect your domain: _Project → Settings → Domains_

---

## Credits

The initial UI design and component structure were bootstrapped using **Google Stitch**, which generated a first version of the Angular app as a starting point.

> [View the original Stitch project](https://stitch.withgoogle.com/projects/4079644074290490504)

From that base, the project was fully extended with: BEM/SCSS refactor, Strava API integration (club data + athlete routes), Instagram highlights proxy, Google Sheets mini-CMS, Vercel serverless functions, i18n (CA/ES/EN), all feature pages, full SEO implementation (SeoService, JSON-LD, sitemap, robots.txt), live dynamic stats from Strava, and club photo gallery.

---

**Strava club:** [strava.com/clubs/1576309](https://www.strava.com/clubs/1576309)  
**Instagram:** [@xeicrunners](https://www.instagram.com/xeicrunners/)
