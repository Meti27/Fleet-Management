# Session Context — Fleet Management Platform

> Living handoff doc so a fresh session picks up without losing context.
> Last updated: **2026-06-26**. For per-change detail see `ProjectChangelog.md`; for
> architecture/commands see `CLAUDE.md`.

## What this product is

A **pitch-ready demo** of a fleet-management SaaS for potential (not-yet-signed) clients.
Target market is **North Macedonia** → use **metric (km, liters)** and **EUR** everywhere.
Strategy: **Android-first (React Native / Expo), $0 budget, demo-first** — build one polished
end-to-end flow rather than half of everything. Push via Expo/FCM is free; the only optional
spend is Apple's $99/yr (deferred until an iOS demo is needed).

Two deployable units in one repo:
- `backend/` — Java 21 / Spring Boot 4 REST API (Maven), package root `com.fleet.backend`.
- `web-dashboard/` — React 19 + Vite 7 + Tailwind 3 SPA (admin dashboard).

Cloud: backend on Railway, frontend on Vercel, Postgres on Neon. **Do not touch Neon prod
directly.** Local/dev DB data is throwaway (safe to reset).

## Roadmap & status

- **Phase 0 — Foundations (DONE):** Flyway owns schema (V1 baseline + V2 maintenance),
  Hibernate `validate`, Testcontainers boot test, CI simplified.
- **Phase 1 — Maintenance logging (DONE):** fuel / maintenance / odometer / documents +
  km/time reminders + document-expiry; admin `TruckDetailPage` + dashboard Fleet Alerts.
- **Phase 1.5 — i18n + responsive polish (DONE 2026-06-25):** EN/SQ/MK + responsive.
- **Phase 2 — Driver app MVP (DONE 2026-06-25):** `DRIVER` role + `drivers.user_id` link, job
  state machine (`OPEN→ASSIGNED→IN_PROGRESS→DONE`, illegal moves → 400), in-app notifications
  (stored + polled), driver-scoped `/api/driver/**` API, and a **mobile-web** driver view
  (`src/driver/`, routes `/driver` + `/driver/jobs/:id`). Decision: mobile-web first, **not**
  Expo yet (that's Phase 4 with push). Verified e2e. See the changelog entry for details.
- **Phase 3 — Live GPS tracking (DONE 2026-06-26):** driver shares location (geolocation +
  demo simulation fallback) → REST ping → backend persists + broadcasts over STOMP/WebSocket →
  admin Leaflet/OSM live map (`/map`). Raw WS (no SockJS); STOMP CONNECT is JWT-authed. See the
  Phase 3 quick reference below + the changelog entry.
- **Phase 4 — Background push + native app (NEXT):** React Native / Expo port of the driver view +
  Expo / FCM push (drivers alerted when the app is closed).

## Live GPS tracking — quick reference (Phase 3)

- **Demo flow:** log in as `driver`/`driver123` → tap the **pin** icon in the driver header to
  start sharing. On a phone it uses real GPS (green pin); if geolocation is denied/unavailable
  (desktop demo) it **simulates** a walk around Skopje (amber pin) so a truck always moves. Then log
  in as `admin`/`admin123` in another browser → **Live Map** nav link → watch the truck move in
  real time. Toggle persists in `localStorage` (`fleet_share_location`).
- **Data path:** driver `POST /api/driver/location` (plain REST, existing JWT filter) →
  `LocationService.record` saves a `location_pings` row and `convertAndSend("/topic/locations", dto)`
  → admin map (subscribed via STOMP) updates its marker. Initial map load is REST
  `GET /api/locations/latest` (latest ping per driver). Only the **admin** side uses WebSocket;
  drivers never open a socket.
- **WebSocket:** endpoint `/ws`, simple broker `/topic`, **raw WS (no SockJS)** → client needs only
  `@stomp/stompjs`. CONNECT is JWT-authed in `StompAuthChannelInterceptor` (same `Bearer` token as
  REST); `SecurityConfig` permits the `/ws/**` handshake. The dev Vite proxy **and** the docker
  `nginx.conf` both proxy `/ws` with the Upgrade header — needed or the map can't connect.
- **Auto-track on Start (2026-06-26):** pressing **Start** auto-begins sharing tagged to that job;
  **Finish** stops it. Sharing lives in `driver/DriverLocationContext` (`DriverLocationProvider` +
  `useDriverLocation`), hosted by the `DriverArea` layout route in `App.jsx` so one tracking session
  spans both driver pages; active job persists in `localStorage` (`fleet_active_job`). The header pin
  still toggles manually (untagged). Pings now carry `jobId`, so the map popup shows the job.
- **Fuel estimation (2026-06-26):** each `Truck` has `fuelConsumptionL100km` (admin-set on TrucksPage;
  Flyway V5). `LocationService.estimateTrip(jobId)` sums **haversine** distance over the job's pings →
  `GET /api/locations/job/{id}/trip` → `TripFuelEstimate` (distance, avg speed [≥60s windows only],
  liters = dist×rate/100, cost from fuel-log avg €/L). Shown in the live-map popup (`TripInfo`).
- **Frontend:** `LiveMapPage.jsx` (admin map + popup trip/fuel), `driver/DriverLocationContext.jsx`
  (geolocation/sim + job tagging), pin toggle in `driver/DriverHeader.jsx`. `api.js` → `postLocation`,
  `fetchLatestLocations`, `fetchTripEstimate`, `wsUrl()`. i18n `map.*` + `trucks.fuel*`.

## Driver app — quick reference (Phase 2)

- **Demo logins:** `driver` / `driver123` (DRIVER) → lands on `/driver`. Admin/dispatcher/viewer
  → `/dashboard`; drivers are bounced out of admin pages and vice-versa (`RequireDriver` /
  `RequireAuth` in `App.jsx`).
- **Flow:** dispatcher assigns a job (driver auto-set to `ASSIGNED`) → driver sees it + a bell
  notification → taps **Start** (→`IN_PROGRESS`) → **Finish** (→`DONE`). The dedicated
  `PATCH /api/jobs/{id}/status` endpoint enforces the state machine; `updateJob`'s admin status
  override stays permissive on purpose.
- **Backend:** `DriverJobController` (`/api/driver/**`) → `DriverService` (resolves current
  driver from JWT, enforces ownership) + `NotificationService`. `GlobalExceptionHandler` now maps
  `AccessDeniedException` → 403 (was 500 for every `@PreAuthorize` denial).
- **Notifications** are in-app (stored, polled every 30s by `DriverHeader`); the message text is
  stored server-side in English — templatize per-language later if needed. Push = Phase 4.
- **Testing note:** Playwright's synthetic pointer-clicks don't reach React 19's delegated
  onClick handlers in this setup (native form-submit and programmatic `.click()` do, and real
  taps work). When driving the driver UI via Playwright, click app buttons through
  `browser_evaluate(() => btn.click())` rather than `browser_click`.

## This session (2026-06-25): internationalization + responsive refinement

**Goal:** make the dashboard fully responsive and add **Albanian (sq)** and **Macedonian (mk)**
alongside English (en), verified live with Playwright.

**i18n — lightweight, zero-dependency (no react-i18next):**
- `src/translations.js` — nested EN/SQ/MK dictionary. Keys are dot-paths grouped by area
  (`common`, `nav`, `login`, `dashboard`, `jobs`, `drivers`, `trucks`, `truckDetail`, plus
  value maps `status.*`, `maintType.*`, `docType.*`, `source.*`). `LANGS` lists the 3 langs.
- `src/i18n.jsx` — `I18nProvider` + `useT()` hook returning `{ t, lang, setLang, langs }`.
  `t(key, vars)` resolves current lang → falls back to English → falls back to the key itself,
  and interpolates `{placeholders}` from `vars`. Choice persists in `localStorage` (`fleet_lang`).
- `src/LanguageSwitcher.jsx` — EN/SQ/MK segmented control. Mounted in the Navbar (desktop +
  mobile drawer) and on the LoginPage (navbar is hidden pre-auth).
- Provider wired in `src/main.jsx` (wraps `AuthProvider`).
- **Every** user-facing string across LoginPage, Navbar, DashboardPage, JobsPage, DriversPage,
  TrucksPage, TruckDetailPage, CreateJobForm, EditJobPanel, JobHistoryPanel now goes through `t()`,
  including status badges, maintenance/document type labels, table headers, placeholders, and
  `alert()`/`confirm()` text.

**Responsive fixes:**
- Added an **`xs` breakpoint (480px)** to `tailwind.config.js` — the dashboard already used
  `xs:` utility classes that were silently no-ops without it.
- Fixed a stray vertical scrollbar on the TruckDetailPage tab strip (`overflow-y-hidden`).
- Verified with Playwright at 390px (mobile) and 1280px (desktop): no horizontal overflow on
  Dashboard or Jobs; mobile card/table swaps, drawer, and language switch all work.

**Gotcha discovered & handled:** several list maps used `t` as the loop variable
(`trucks.map((t) => …)`), which would shadow the translation function. Renamed those to
`truck` / `tr` in `TrucksPage`, `CreateJobForm`, `EditJobPanel`. **Watch for this** when adding
`useT()` to any component that maps over a collection named `t`.

**Misc:** `vite.config.js` proxy target is now `process.env.VITE_PROXY_TARGET || localhost:8080`,
so the dev server can point at the dockerized backend (8085).

### Adding/Editing translations
1. Add the key to all three languages in `src/translations.js` (missing keys fall back to EN,
   then to the raw key — so partial additions won't crash).
2. In the component: `const { t } = useT();` then `t("area.key")` or `t("area.key", { id })`.
3. New top-level value sets (e.g. a new enum) → add a `status.*`-style map and call
   `t(\`maintType.${value}\`)`.

## How to run locally

- **Full stack (what the user tests):** `docker compose up -d --build` → Postgres (host 5433),
  backend (host **8085**), nginx frontend (host **3000**). Login `admin/admin123` (also
  `dispatcher/dispatch123`, `viewer/viewer123`).
- **Fast frontend iteration (hot reload, used this session):**
  `cd web-dashboard && VITE_PROXY_TARGET=http://localhost:8085 npm run dev` → http://127.0.0.1:5173
  (proxies `/api` to the docker backend on 8085). Requires the docker `backend` + `db` to be up.
- **Backend tests:** `cd backend && ./mvnw clean test` (Testcontainers; skips green without Docker).
- **Frontend build:** `cd web-dashboard && npm run build` (CI gates on build, **not** lint).

> Note: hard-reloading a protected route redirects to `/login` momentarily because
> `AuthContext.isAuthenticated` starts `false` before its `useEffect` restores from localStorage.
> Client-side nav is fine. Minor pre-existing SPA quirk; fix later by initializing auth state
> synchronously from localStorage.

## Known debt / TODO (carry-over)

- Rename `Job.createAt` typo → `createdAt` via a data-preserving Flyway migration.
- Replace `ProdUserSeeder` hard-coded demo credentials before any real client use.
- Pre-existing lint debt in `AuthContext.jsx` / `Navbar.jsx` (`npm run lint` fails; build passes).
- Frontend bundle >500 kB — consider code-splitting (recharts is heavy) before launch.
- i18n currently covers the dashboard only; the future Expo driver app will need its own bundle.
