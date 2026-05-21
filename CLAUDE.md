# CLAUDE.md

Guía operativa para futuras sesiones de Claude trabajando sobre **XEIC Runners**.
Mantener este archivo conciso y actualizado cuando cambien stack, arquitectura o convenciones.

---

## 1. Resumen del proyecto

Sitio web del club de running **XEIC Runners** (La Sénia). Single Page Application
multilenguaje (ca/es/en) que muestra fundadores, eventos, rutas y comunidad, integrando
datos de **Strava** (club, atletas, rutas) e **Instagram** (highlights). Despliegue en
**Vercel** con frontend estático + funciones serverless como BFF.

---

## 2. Stack tecnológico

- **Framework**: Angular 17 (`^17.3.0`) — standalone components, signals, lazy routes.
- **Lenguaje**: TypeScript 5.4 con `strict`, `noImplicitOverride`, `noImplicitReturns`,
  `noPropertyAccessFromIndexSignature`, `strictTemplates`, `strictInjectionParameters`.
- **Estilos**: SCSS (`inlineStyleLanguage: scss`), `autoprefixer` vía `postcss.config.js`.
- **Estado/reactividad**: `signal()` / `computed()` + RxJS donde haga falta (`HttpClient`).
- **Routing**: `provideRouter` con `withViewTransitions()` y scroll restoration.
- **Backend (BFF)**: funciones serverless de Vercel en `/api` (Node, sin framework).
- **Integraciones externas**: Strava API v3, Instagram (endpoint público de highlights).
- **Telemetría**: `@vercel/analytics` y `@vercel/speed-insights` (inicializados en `main.ts`).
- **Tests**: Karma + Jasmine instalados; *schematics configurados con `skipTests: true`*,
  por lo que actualmente no hay specs. No asumir cobertura existente.
- **Despliegue**: Vercel (`vercel.json`). Output: `dist/xeic-runners/browser`.

---

## 3. Estructura de carpetas

```
xeic-runners/
├── angular.json            # config Angular CLI (builder application)
├── vercel.json             # rewrites SPA + headers de seguridad y caché
├── proxy.conf.json         # proxy de dev: /api/* -> localhost:3000
├── postcss.config.js       # autoprefixer
├── tsconfig*.json          # TS estricto
├── .env                    # secretos Strava + Instagram (NO commitear)
├── api/                    # Serverless functions (Vercel) — BFF
│   ├── strava.js           # GET /api/strava (club + miembros, cache 5 min)
│   ├── instagram.js        # GET /api/instagram (highlights, cache 30 min)
│   └── routes.js           # GET /api/routes (rutas atleta, cache 15 min)
├── scripts/
│   ├── dev-api.mjs         # servidor HTTP local que emula /api en :3000
│   └── strava-auth.mjs     # flujo OAuth interactivo para obtener refresh_token
└── src/
    ├── main.ts             # bootstrap + inject analytics/speed-insights
    ├── index.html
    ├── styles.scss         # estilos globales
    ├── assets/
    │   ├── i18n/{ca,es,en}.json
    │   └── images/...
    └── app/
        ├── app.component.{ts,html,scss}
        ├── app.config.ts   # providers globales (router, http)
        ├── app.routes.ts   # rutas con loadComponent (lazy)
        ├── core/
        │   ├── models/     # event, instagram, member, route, strava
        │   └── services/   # events-sheet, i18n, instagram, seo,
        │                   #   strava-routes, strava
        ├── shared/components/   # navbar, footer, event-card, route-card
        └── features/            # vistas (una por ruta, todas lazy)
            ├── home/
            ├── fundadors/
            ├── esdeveniments/
            ├── rutes/
            └── comunitat/
```

Reglas implícitas: cada *feature* es un componente standalone autosuficiente; lo que
se comparte entre features se eleva a `shared/components` o `core/services`.

---

## 4. Flujo de datos

1. El usuario navega a una ruta (`/`, `/fundadors`, `/esdeveniments`, `/rutes`,
   `/comunitat`). El router carga el componente de feature mediante `loadComponent`.
2. El componente inyecta servicios de `core/services` (HttpClient-based).
3. Los servicios consumen endpoints **relativos** `/api/strava`, `/api/instagram`,
   `/api/routes`.
4. En **producción** esos endpoints los sirven las funciones serverless de Vercel
   (carpeta `/api`), que leen credenciales desde variables de entorno del proyecto
   Vercel y aplican caché en memoria.
5. En **desarrollo** `npm start` levanta `ng serve` con `proxy.conf.json`, que
   redirige `/api/*` a `http://localhost:3000` (servidor local de `scripts/dev-api.mjs`,
   que reutiliza los mismos handlers de `/api`).
6. `I18nService` carga `assets/i18n/<lang>.json` por HTTP, lo cachea, expone
   `currentLang`, `translations` y `t(key)` mediante signals; persiste el idioma
   activo en `localStorage` bajo la clave `xeic-lang`.

Las funciones serverless mantienen caché en memoria de proceso (no compartida entre
instancias frías). Es intencional para reducir cuota de Strava/Instagram pero no
sustituye un caché distribuido.

---

## 5. Comandos habituales

```bash
# Desarrollo
npm start                 # ng serve con proxy a localhost:3000
npm run strava:api        # levanta el servidor local de /api en :3000
npm run strava:auth       # flujo OAuth Strava (genera refresh_token)

# Build
npm run build             # ng build production -> dist/xeic-runners/browser
npm run watch             # build development en watch mode

# Calidad
npm test                  # Karma + Jasmine (sin specs por defecto)
```

Para correr el sitio completo en local hacen falta **dos terminales**: una con
`npm run strava:api` y otra con `npm start`.

---

## 6. Variables de entorno

Definidas en `.env` (gitignorado). Las funciones serverless las consumen vía
`process.env`. Replicar los mismos nombres en *Project Settings → Environment
Variables* de Vercel.

- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, `STRAVA_ATHLETE_ID`
- `INSTAGRAM_SESSION_ID`

Nunca commitear `.env` ni imprimir su contenido en logs ni en respuestas al usuario.

---

## 7. Convenciones de código

- **Prefijo de selectores**: `app` (configurado en `angular.json`).
- **Componentes**: standalone (sin NgModules). Estilo SCSS, sin tests autogenerados.
- **Servicios**: `@Injectable({ providedIn: 'root' })`. Preferir `signal()`/`computed()`
  para estado expuesto; RxJS solo donde aporta (streams HTTP, side-effects).
- **Modelos**: interfaces/types en `core/models/*.model.ts`.
- **Plantillas estrictas** (`strictTemplates: true`): los `*ngIf`/bindings deben tener
  tipo conocido; usar `as` aliases cuando proceda.
- **Lazy routing**: toda nueva vista de nivel de página entra como `loadComponent`.
- **i18n**: textos visibles vía `I18nService.t('clave.anidada')`, claves replicadas
  en los tres ficheros `assets/i18n/{ca,es,en}.json`.
- **HTTP**: rutas **relativas** (`/api/...`). No hardcodear `localhost` ni dominios
  de Vercel en el código.

---

## 8. Despliegue (Vercel)

- `buildCommand`: `npm run build`.
- `outputDirectory`: `dist/xeic-runners/browser` (Angular 17 application builder).
- `rewrites`: cualquier ruta que no empiece por `/api/` se reescribe a `/index.html`
  (SPA fallback). No tocar este patrón sin coordinarlo con `app.routes.ts`.
- Cabeceras: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` con
  `camera/microphone/geolocation` deshabilitadas. Cache largo para `/assets/*`.

---

## 9. Puntos sensibles y deuda técnica conocida

- **Sin tests**: `skipTests: true` en todos los schematics. Antes de tocar lógica
  crítica (servicios, parsers de Strava) plantear añadir specs puntuales.
- **Caché en memoria de las funciones serverless**: no resiste cold starts ni
  invalidaciones manuales. Aceptable hoy; valorar KV/Edge Cache si el tráfico crece.
- **Acoplamiento a Instagram no oficial**: `api/instagram.js` usa endpoint interno
  (`i.instagram.com/api/v1/...`) y `INSTAGRAM_SESSION_ID`. Es frágil ante cambios
  de Meta; documentar/aislar para poder sustituirlo por la API oficial si rompe.
- **i18n por HTTP en runtime**: cada cambio de idioma dispara una request. Acceptable
  por el tamaño actual del JSON; revaluar si crece.
- **Sin interceptor HTTP global** ni manejo centralizado de errores: cada servicio
  gestiona sus errores. Considerar un `HttpInterceptor` si se añaden más endpoints.

---

## 10. Reglas para Claude al trabajar aquí

1. Antes de modificar: leer este archivo y los servicios/modelos implicados.
2. Mantener compatibilidad de comportamiento salvo solicitud explícita.
3. No introducir dependencias nuevas sin justificación clara (impacto en bundle:
   los budgets son 500 KB warning / 1 MB error inicial).
4. No hacer refactors masivos, renombrados arbitrarios ni cambios estéticos.
5. Si añades una vista, regístrala como `loadComponent` en `app.routes.ts` y
   provee `title`. Añade traducciones en los tres JSON de i18n.
6. Si añades un endpoint, créalo en `/api`, replícalo en `scripts/dev-api.mjs`
   y añade la entrada correspondiente en `proxy.conf.json`.
7. Nunca exponer secretos ni el contenido de `.env`.
8. Seguir el formato de respuesta del proyecto: *Análisis → Plan → Cambios →
   Código → Riesgos*.

## 11. Skill usage

Use these skills when relevant:

- Use `repo-onboarding` before understanding or changing unfamiliar areas.
- Use `safe-change` for implementation work.
- Use `debugging` for errors, failing tests or unexpected behavior.
- Use `code-review` before finalizing changes.
- Use `documentation` for README or documentation updates.

## 12. External design skills

Use UI/design skills only when working on:

- frontend components
- visual hierarchy
- UX improvements
- animations
- interaction patterns

Do not use design skills for:

- backend logic
- database schema
- APIs
- CI/CD
- business logic
- infrastructure

Do not redesign existing interfaces unless explicitly requested.

Prefer preserving design consistency over introducing novelty.