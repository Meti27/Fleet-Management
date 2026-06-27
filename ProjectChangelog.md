# Project Changelog

---
### [2026-06-27] Edit-job scroll-into-view fix + feature smoke test

**Changes:** Fixed a reported UX bug where clicking **Edit** on a job appeared to do nothing — the
`EditJobPanel` renders at the bottom of the page (after the full jobs list), so on long lists it
opened below the fold. Now the panel scrolls into view (smooth) when a job is opened for editing.
Then ran a functional sweep of the backend API to confirm features work end-to-end.

**Frontend (`JobsPage.jsx`):**
- Added a `useRef` on the edit-panel wrapper + a `useEffect` that `scrollIntoView`s it whenever
  `editingJob` changes. Wrapper uses `scroll-mt-20` so it lands below the sticky navbar, not under it.
- Verified live via Vite dev server + Playwright: clicking Edit scrolls the panel fully into the
  viewport with all fields prefilled.

**Verification (docker stack, admin):**
- Reads OK: drivers(7), trucks(6 w/ fuel rates), jobs(33), locations/latest.
- Writes OK: `PUT /jobs/{id}` (edit), `PATCH /jobs/{id}/status?status=` (transitions return 200;
  illegal transitions return a clean 400 message), `GET /jobs/{id}/history`.
- Maintenance/GPS OK: `/trucks/{id}/summary`, `/trucks/{id}/reminders`, `/reminders`,
  `/locations/job/{id}/trip` (trip/fuel estimate).
- Note: job status is updated via **PATCH + query param**, not PUT + JSON body (the frontend already
  does this correctly).

**TODOs:** None from this session. (Carryover: error-path `ApiError.timestamp` Instant occasionally
surfaces a secondary serialization error in container `/error` forwarding — cosmetic log noise, the
primary JSON error response serializes fine.)

---
### [2026-06-26] Dashboard redesign + richer demo data

**Changes:** Reworked the dashboard to look more professional and seeded a fuller demo dataset so it
shows well populated. Verified on the docker stack (desktop + 390px mobile, 0 console errors).

**Frontend (`DashboardPage.jsx`):**
- Replaced the two flat bar charts with: a **revenue area trend** (last 8 weeks, gradient fill,
  computed client-side from DONE jobs' dropoff dates + price) and a **jobs-by-status donut**
  (color-coded, center total, legend).
- Refined the rest: KPI cards with colored accent bars (Total Revenue + last-30d, Active Jobs,
  Drivers, Trucks), **Fleet Utilization** as progress bars (replacing the old chips), Fleet Alerts
  with an empty-state, and the existing Active-Jobs-Today table/cards kept. Card styling unified
  (`rounded-2xl`, `border-slate-800`).
- New i18n `dashboard.revenueTrend/revenueTotal/fleetUtilization/noAlerts` (EN/SQ/MK); `revenueHint`
  reworded.

**Backend (`DevDataSeeder.java`, dev profile only):**
- Expanded demo data to **7 drivers, 6 trucks, ~33 jobs**: ~22 priced DONE jobs dated across the
  last 8 weeks (drives the revenue figures/trend), 3 today's active jobs, 4 upcoming, 3 cancelled —
  with NM city routes. Deterministic (fixed RNG seed) so the demo is identical on every fresh boot.
- Bulk jobs are saved directly (skipping conflict validation); the linked driver's ASSIGNED job is
  still created via `JobService` **first** (empty table → no conflict) so the JOB_ASSIGNED
  notification still fires. Requires a DB reset (`docker compose down -v`) to re-seed — done.

**Decisions:** Revenue trend is derived in the browser from the jobs list (no new endpoint).

---
### [2026-06-26] Auto-track on job Start + GPS-based fuel estimation

**Changes:** Two follow-ups to Phase 3. (1) Pressing **Start** on a job now auto-begins location
sharing tagged to that job (no separate manual step), and **Finish** stops it. (2) Each truck has a
rated fuel consumption (L/100km); the backend computes per-trip distance from the job's GPS pings and
estimates fuel + cost, shown in the admin live-map popup. Verified end-to-end on the docker stack
(driver Start → tagged pings → map popup shows distance/speed/fuel).

**Backend:**
- `trucks.fuel_consumption_l100km` (Flyway `V5__truck_fuel_rate.sql`, nullable/additive) + `Truck`
  field; `TruckController.updateTruck` persists it; `DevDataSeeder` seeds rates (28.5/30.0/27.0).
- `LocationService.estimateTrip(jobId)`: sums **haversine** distance over the job's ordered pings,
  derives avg speed (guarded to ≥60s windows so a few quick pings can't yield an absurd figure) and
  duration, then `liters = distanceKm × rate / 100`; cost uses the avg €/L from that truck's fuel
  logs (null when none). New `TripFuelEstimate` DTO; `GET /api/locations/job/{jobId}/trip`.
- `LocationPingRepository.findByJob_IdOrderByRecordedAtAsc` (one trip's track).

**Frontend:**
- Location sharing refactored from a local hook into `driver/DriverLocationContext` (`DriverLocationProvider`
  + `useDriverLocation`), hosted by a new `DriverArea` layout route so one tracking session spans both
  driver pages. Pings now carry the active job id; the active job persists in `localStorage`
  (`fleet_active_job`) so a mid-trip reload keeps tagging. `DriverJobsPage`/`DriverJobDetailPage` call
  `startForJob`/`stopForJob` on Start/Finish; the header pin still toggles manually. (Old
  `useShareLocation.js` removed.)
- `TrucksPage`: fuel-consumption input (create/edit) + a "Fuel (L/100km)" column in table/cards.
- `LiveMapPage`: popup now fetches `fetchTripEstimate(jobId)` and shows distance / avg speed /
  est. fuel / est. cost (`TripInfo`). New `map.*` + `trucks.fuel*` i18n in EN/SQ/MK.

**Decisions:** Rate is a per-truck nominal field (admin-set), matching "depending on the truck";
distance comes from real GPS pings, not job pickup/dropoff. Cost is best-effort from fuel-log price
history (no separate fuel-price config yet).

**TODOs:** Optionally show the same trip/fuel panel on the admin job detail (not just the map popup),
and add a configurable default €/L so cost shows before any fuel logs exist.

---
### [2026-06-26] Fix: admin navbar missing on the Drivers page

**Changes:** The admin `Navbar` was hidden on `/drivers`. Root cause: `App.jsx` computed
`isDriverArea = pathname.startsWith("/driver")`, and `/drivers` also starts with `/driver`, so the
admin layout treated the Drivers page as part of the driver app (which renders its own header). Now
matches the driver area precisely: `pathname === "/driver" || pathname.startsWith("/driver/")`.
Swept all 8 routes in both roles (Playwright): admin nav present on every admin page incl. `/map`,
DriverHeader (and no admin nav) on `/driver` + `/driver/jobs/:id`, role bouncing intact, and no
horizontal overflow at 390px on any page. 0 console errors.

**Files:** `web-dashboard/src/App.jsx`.

---
### [2026-06-26] Phase 3 — Live GPS tracking (Leaflet + WebSocket)

**Changes:** Drivers can now share their live location; admins watch the whole fleet move on a
real-time map. Driver app POSTs GPS pings over REST; the backend persists them and fans each one
out over STOMP-over-WebSocket to an admin Leaflet/OpenStreetMap map (no live-map polling — pushed).
Verified the schema/entity match by booting the real docker stack (Flyway V4 + Hibernate `validate`).

**Backend:**
- New `location_pings` table (Flyway `V4__gps_tracking.sql`, additive/prod-safe) + `LocationPing`
  entity (LAZY + `@JsonIgnore` relations; flat DTO is the only wire shape). History is retained so a
  route trail can be drawn later; "current position" = latest ping per driver
  (`LocationPingRepository.findLatestPerDriver`).
- `LocationService.record` persists a ping and broadcasts a `DriverLocationDto` to the STOMP topic
  `/topic/locations` (`@Transactional`); `latestLocations()` serves the map's initial snapshot.
- **WebSocket:** `spring-boot-starter-websocket`; `config/WebSocketConfig` (simple broker `/topic`,
  app prefix `/app`, endpoint `/ws`, **raw WebSocket — no SockJS**, so the client only needs
  `@stomp/stompjs`). CONNECT frames are JWT-authed by `security/StompAuthChannelInterceptor` (reads
  the same `Bearer` token as REST; invalid/absent → CONNECT rejected). `SecurityConfig` permits the
  `/ws/**` handshake (auth enforced at CONNECT, not the handshake).
- Endpoints: `POST /api/driver/location` (DRIVER-scoped, on `DriverJobController`) and
  `GET /api/locations/latest` (`LocationController`, any authenticated staff).

**Frontend (`web-dashboard/`):**
- Deps: `leaflet`, `react-leaflet`, `@stomp/stompjs`.
- Admin **`LiveMapPage`** (route `/map`, nav link added): OSM tiles, one self-contained truck
  `divIcon` per driver (no marker-image assets → sidesteps the leaflet+bundler icon issue), popups
  (driver, job, speed, last-seen), auto-fit bounds when the driver set changes, and a live/connecting/
  offline connection badge. Initial load via REST, then live updates via STOMP subscribe.
- Driver: `useShareLocation` hook + a pin toggle in `DriverHeader`. Watches `navigator.geolocation`
  and POSTs throttled pings (≤1/8s). **Demo fallback:** if geolocation is denied/unavailable (e.g.
  desktop), it transparently simulates a walk around Skopje so the pitch always shows a moving truck
  (green pin = live GPS, amber pin = simulated). Choice persists in `localStorage`.
- `api.js`: `postLocation`, `fetchLatestLocations`, `wsUrl()` (derives ws(s):// from `VITE_API_BASE`
  or the current origin). `vite.config.js` + `nginx.conf` now proxy `/ws` with WebSocket upgrade so
  the map works through the dev proxy and the docker/nginx frontend.
- i18n: new `map.*` namespace + `nav.map` + `driver.shareLocation/locationLive/locationSim` in EN/SQ/MK.

**Decisions:** Drivers push location over plain REST (reuses the existing JWT filter); only the admin
map consumes WebSocket — far simpler than authenticating STOMP on both sides. Raw WS (no SockJS) to
keep the bundle lean. Latest-per-driver is computed from full history, not a denormalized "current"
column (room to add trails/replay later).

**TODOs:** Attach the in-progress job id to driver pings (currently null — map shows driver but not
which job). Consider trimming ping history / a retention job before real use. Bundle is now ~864 kB
(leaflet added) — code-splitting the map + recharts is worth doing before launch.

---
### [2026-06-25] Phase 2 — Driver app MVP (mobile-web)

**Changes:** Turned the admin-only platform into a two-sided product. Dispatchers assign a job →
the driver sees it on their phone → taps Start, then Finish. Driver surface is a mobile-first view
inside the existing React app (reuses auth, i18n, api layer); a native Expo app stays deferred to
Phase 4 when background push matters. Verified end-to-end against the docker stack.

**Backend:**
- New `DRIVER` role; `drivers.user_id` links a driver to a login account (Flyway `V3__driver_app.sql`,
  additive/prod-safe) — `Driver.user` (`@OneToOne`, `@JsonIgnore`).
- Job **state machine** in `JobServiceImpl`: `validateTransition` enforces
  `OPEN→{ASSIGNED,IN_PROGRESS,CANCELLED}`, `ASSIGNED→{IN_PROGRESS,OPEN,CANCELLED}`,
  `IN_PROGRESS→{DONE,CANCELLED}`, and terminal `DONE`/`CANCELLED` (illegal moves → 400). Assigning
  a driver to an OPEN job auto-promotes it to `ASSIGNED`.
- **In-app notifications** (stored + polled; push is Phase 4): `Notification` entity +
  `notifications` table + `NotificationService`. A `JOB_ASSIGNED` notification is created when a
  driver is newly assigned, inside the job's transaction.
- Driver-scoped API `controller/DriverJobController` (`/api/driver/**`, `@PreAuthorize("hasRole('DRIVER')")`)
  via `DriverService` (resolves the current driver from the JWT, enforces job ownership):
  `GET /me/jobs`, `POST /jobs/{id}/{start,finish}`, `GET /me/notifications[/unread-count]`,
  `POST /notifications/{id}/read`, `POST /notifications/read-all`.
- **Bug fix:** `GlobalExceptionHandler` now maps Spring Security `AccessDeniedException` → **403**
  (it was being swallowed by the catch-all `Exception` handler and returned as **500** — affected
  every `@PreAuthorize` denial, Phase 1 included).
- Dev seeding: `driver`/`driver123` (`Role.DRIVER`) linked to a demo driver with one seeded
  ASSIGNED job, so the app + a notification have content on first run.

**Frontend (mobile-web in `web-dashboard/`):**
- Role-aware routing in `App.jsx` (`RequireDriver` guard; admin `RequireAuth` bounces drivers to
  `/driver`; admin Navbar hidden on `/driver/*`). `AuthContext.login` returns the role;
  `LoginPage` sends `DRIVER` → `/driver`.
- New `src/driver/`: `DriverHeader` (brand, language switcher, polling notification bell + dropdown,
  logout), `DriverJobsPage` (`/driver` — my-jobs cards with Start/Finish), `DriverJobDetailPage`
  (`/driver/jobs/:id` — detail, big Start/Finish, status timeline), `ui.jsx` (shared StatusBadge +
  date format).
- `api.js` — driver endpoints (`fetchMyJobs`, `startJob`, `finishJob`, notifications).
- `translations.js` — new `driver.*` namespace in EN/SQ/MK.

**Files:**
- Backend new: `entity/Notification.java`, `repository/NotificationRepository.java`,
  `service/{NotificationService,DriverService}.java`, `controller/DriverJobController.java`,
  `db/migration/V3__driver_app.sql`.
- Backend modified: `security/Role.java`, `entity/Driver.java`, `repository/{Driver,Job}Repository.java`,
  `service/JobServiceImpl.java`, `error/GlobalExceptionHandler.java`, `bootstrap/Dev{User,Data}Seeder.java`.
- Frontend new: `src/driver/{DriverHeader,DriverJobsPage,DriverJobDetailPage,ui}.jsx`.
- Frontend modified: `src/{App,AuthContext,LoginPage,api,translations}.jsx/.js`.

**Decisions:**
- State machine kept permissive enough not to break the dashboard (OPEN can still go straight to
  IN_PROGRESS) while blocking nonsense (finish-before-start, reviving closed jobs).
- Notifications stored + polled (30s) rather than pushed — $0 and demo-appropriate; FCM is Phase 4.
- `updateJob`'s admin status override stays permissive; the dedicated `/status` endpoint is where
  the machine is enforced (the path the dashboard + driver buttons use).

**Verification:** `./mvnw clean test` green (boot/migration test skips locally without Docker, runs
in CI); against the docker stack — driver login returns the seeded ASSIGNED job; start→IN_PROGRESS,
finish→DONE; finish-before-start → 400; admin on `/api/driver/**` → 403; JOB_ASSIGNED notification +
unread count correct; Playwright @390px end-to-end through the driver app in EN/SQ/MK.

**TODOs:** drivers reuse `/api/jobs/{id}/history` (authenticated, not driver-scoped) for the timeline
— fine for now; native Expo app + FCM push is Phase 4; rename `Job.createAt`; harden `ProdUserSeeder`.

---
### [2026-06-25] Dashboard i18n (EN/SQ/MK) + responsive refinement

**Changes:** Made the web dashboard fully multilingual and tightened responsiveness, verified
live with Playwright across mobile (390px) and desktop (1280px) in all three languages.

**Internationalization (lightweight, no new dependency):**
- Added a custom i18n layer instead of pulling in react-i18next:
  - `src/translations.js` — nested EN / Albanian (sq) / Macedonian (mk) dictionary, grouped by
    area plus value maps (`status.*`, `maintType.*`, `docType.*`, `source.*`). `LANGS` lists langs.
  - `src/i18n.jsx` — `I18nProvider` + `useT()` hook. `t(key, vars)` resolves current lang →
    English → raw key, and interpolates `{placeholders}`. Persists choice in `localStorage`
    (`fleet_lang`). Wired into `src/main.jsx` wrapping `AuthProvider`.
  - `src/LanguageSwitcher.jsx` — EN/SQ/MK segmented control; placed in the Navbar (desktop +
    mobile drawer) and on the LoginPage (navbar hidden pre-auth).
- Routed **every** user-facing string through `t()` across LoginPage, Navbar, DashboardPage,
  JobsPage, DriversPage, TrucksPage, TruckDetailPage, CreateJobForm, EditJobPanel,
  JobHistoryPanel — including status badges, maintenance/document type labels, table headers,
  input placeholders, and `alert()`/`confirm()` strings.

**Responsive fixes:**
- Added an `xs` (480px) breakpoint to `tailwind.config.js` — the dashboard already used `xs:`
  utilities that were silently inert without it.
- Removed a stray vertical scrollbar on the TruckDetailPage tab strip (`overflow-y-hidden`).
- Confirmed no horizontal overflow on Dashboard/Jobs at 390px; mobile card/table swaps, the
  drawer, and live language switching all verified via Playwright.

**Other:** `vite.config.js` proxy target is now `process.env.VITE_PROXY_TARGET || localhost:8080`
so the dev server can target the dockerized backend (8085). Added `SESSION_CONTEXT.md` as a
cross-session handoff doc.

**Files:**
- New: `web-dashboard/src/translations.js`, `web-dashboard/src/i18n.jsx`,
  `web-dashboard/src/LanguageSwitcher.jsx`, `SESSION_CONTEXT.md`.
- Modified: `web-dashboard/src/main.jsx`, `tailwind.config.js`, `vite.config.js`, and the 10
  page/component files listed above.

**Decisions:**
- Hand-rolled i18n (≈1 small provider + a JSON dictionary) over react-i18next: zero dependency/
  build risk, full control, trivial fallback chain — appropriate for a demo of this size.
- Translated enum-like values (status, maintenance/document types, odometer source) via lookup
  maps with English fallback, keeping the underlying API values unchanged.

**Gotcha:** several list maps used `t` as the loop variable (`trucks.map((t) => …)`), which
shadows the translation function. Renamed to `truck`/`tr` in TrucksPage, CreateJobForm,
EditJobPanel. Watch for this when adding `useT()` to a component that maps a collection named `t`.

**TODOs / known issues:**
- i18n covers the dashboard only; the future Expo driver app needs its own translation bundle.
- Frontend bundle >500 kB (recharts heavy) — consider code-splitting before launch.
- Pre-existing: hard-reloading a protected route flashes `/login` (auth state starts `false`
  before the restore effect); fix by hydrating `AuthContext` synchronously from localStorage.

---
### [2026-06-24] Phase 0 (Flyway foundation) + Phase 1 (fleet maintenance logging)

**Changes:** First feature increment toward the pitch-ready product. Two parts.

**Phase 0 — Flyway foundation (schema now migration-managed):**
- Enabled real Flyway migrations and made Flyway the single owner of the schema; Hibernate switched from `ddl-auto=update` to `validate` (base `application.properties`). Removed the per-profile `ddl-auto=update` overrides and the prod `spring.flyway.enabled=false`.
- Added `V1__baseline_schema.sql` (the pre-existing tables, generated to match the entities exactly) and `V2__fleet_maintenance.sql` (the new maintenance tables). `baseline-on-migrate` lets the existing prod DB adopt Flyway without a rebuild.
- Spring Boot 4 split auto-config into per-library modules, and Flyway 11 modularized DB support — added `spring-boot-flyway` and `flyway-database-postgresql` dependencies (without these Flyway silently does not run / can't speak Postgres).
- Replaced the no-op (`@SpringBootTest` was commented out) test with a real Testcontainers boot test that starts the app against a throwaway Postgres, so every CI run actually verifies the migrations + JPA validation. `@Testcontainers(disabledWithoutDocker = true)` keeps `mvn test` green where Docker isn't reachable.
- Simplified CI: removed the vestigial MariaDB service (the old test never connected) — the boot test self-provisions Postgres via Testcontainers.
- Fixed the dev datasource default (was a MariaDB URL with the Postgres driver) → `jdbc:postgresql://localhost:5432/fleetdb`.

**Phase 1 — Fleet health & maintenance logging:**
- New entities + tables: `fuel_logs`, `maintenance_records`, `odometer_readings`, `truck_documents`, `maintenance_schedules` (metric/km, EUR).
- `FleetMaintenanceService`: truck-scoped CRUD; mirrors any fuel/maintenance odometer into `odometer_readings` so "current km" has one source of truth; computes total fuel/maintenance spend and average fuel efficiency (L/100km).
- `MaintenanceReminderService`: interval-based (km and/or months) preventive-maintenance reminders plus document-expiry reminders, classified OVERDUE / DUE_SOON, fleet-wide and per-truck.
- REST: `/api/trucks/{id}/{fuel-logs,maintenance,odometer,documents,schedules,summary,reminders}` and `/api/reminders`. Reads = authenticated; writes = ADMIN/DISPATCHER.
- Admin UI: new `TruckDetailPage` (`/trucks/:id`) with summary cards + tabbed Fuel / Maintenance / Odometer / Documents / Schedules; "Manage" buttons on the Trucks list; a "Fleet Alerts" panel on the dashboard linking to the relevant truck.

**Verification:** booted the app against a disposable Postgres and confirmed V1+V2 apply, `validate` passes, and the app starts clean; ran an HTTP e2e (login → add fuel/maintenance/schedule/document → summary + reminders) — current km, costs, and both reminder types computed correctly; `/api/health` public (200), unauthenticated write 401. Frontend `npm run build` green.

**Files:**
- Backend: `pom.xml`; `application.properties` + `application-{dev,ci,prod}.properties`; `db/migration/V1__baseline_schema.sql`, `V2__fleet_maintenance.sql`; entities `FuelLog`, `MaintenanceRecord`, `OdometerReading`, `TruckDocument`, `MaintenanceSchedule`; 5 repositories; DTOs (`*Request`, `ReminderDto`, `TruckMaintenanceSummary`); `FleetMaintenanceService`, `MaintenanceReminderService`; `TruckMaintenanceController`, `ReminderController`; `BackendApplicationTests` (Testcontainers); `src/test/resources/application.properties`.
- CI: `.github/workflows/ci.yml`.
- Frontend: `src/api.js`, `src/TruckDetailPage.jsx` (new), `src/App.jsx`, `src/TrucksPage.jsx`, `src/DashboardPage.jsx`.

**Decisions:**
- Maintenance `type` and document `type` are stored as strings (with a known-values convention), matching the project's existing free-string `status` style, to avoid enum/CHECK-constraint coupling with migrations.
- Reminder thresholds: maintenance DUE_SOON within 1000 km or 30 days; documents within 30 days. Hard-coded for now; could become configurable.
- Deferred the `DRIVER` role + job state machine to Phase 2 (driver app) — maintenance logging doesn't need them.

**TODOs / known issues:**
- `mvn test` only *runs* the boot/migration test where Docker's API is reachable; on this dev machine the daemon rejects Testcontainers' default client API version, so it skips locally (runs in CI). Worth pinning later.
- Pre-existing frontend lint debt in `AuthContext.jsx` and `Navbar.jsx` (`npm run lint` fails; `npm run build` passes and is what CI gates). Untouched this session.
- Fuel efficiency needs ≥2 fuel logs that carry an odometer reading before it reports a value.
- Still open from last session: rename `Job.createAt` typo via migration; replace `ProdUserSeeder` hard-coded credentials.

---
### [2026-06-24] Bug-fix pass + documentation refresh
**Changes:** Audited the backend, Docker, and CI configuration after a period of inactivity and fixed several latent bugs, then rewrote the README and added this changelog.

Bug fixes:
- **Backend unreachable from host in Docker.** `docker-compose.yml` mapped the backend as `8085:8087`, but the Spring Boot app inside the container listens on `8080` (default, no `server.port` in the dev profile). Nothing listened on `8087`, so the published host port was dead. Changed mapping to `8085:8080`. (In-cluster nginx→`backend:8080` was already correct, so this only affected direct host access.)
- **Health endpoint required authentication.** `/api/health` was caught by `anyRequest().authenticated()` in `SecurityConfig`, so monitoring/uptime checks (e.g. Railway) got `401`. Added it to the `permitAll()` list alongside `/api/auth/**`.
- **Conflicting CORS configuration.** Every controller carried `@CrossOrigin(origins = "*")` while `SecurityConfig` defines a centralized CORS policy with `allowCredentials(true)`. The `*`-origin + credentials combination is rejected by browsers and the duplicated config produced conflicting `Access-Control-Allow-*` headers (the likely cause of prior "cors issue" commits). Removed the controller-level annotations so CORS is governed solely by `SecurityConfig`.
- **CI JWT property referenced the wrong variable.** `application-ci.properties` set `security.jwt.secret=${JWT_SECRET}`, but CI exports `SECURITY_JWT_SECRET` and only worked because the Maven command passes `-Dsecurity.jwt.secret`. Aligned it to `${SECURITY.JWT_SECRET}` so the file is correct on its own.
- **Stray/incorrect import.** Removed `import org.springframework.cglib.core.Local;` from `Job.java` (unused, IDE-autocompleted into the wrong type).
- **Encapsulation.** `DriverController.driverRepository` was a `public` field; made it `private final` to match the other controllers.

**Files:**
- `docker-compose.yml`
- `backend/src/main/java/com/fleet/backend/security/SecurityConfig.java`
- `backend/src/main/java/com/fleet/backend/controller/{Auth,Job,Truck,Dashboard,Driver}Controller.java`
- `backend/src/main/resources/application-ci.properties`
- `backend/src/main/java/com/fleet/backend/entity/Job.java`
- `README.md` (rewritten), `ProjectChangelog.md` (new), `CLAUDE.md` (added earlier this session)

**Decisions:**
- Kept CORS centralized in `SecurityConfig` rather than per-controller — the README already advertised "centralized access rules", and a single source avoids duplicate-header bugs.
- Left the JWT secret placeholder style as `${SECURITY.JWT_SECRET}` (dot form). It resolves from the `SECURITY_JWT_SECRET` env var via Spring's relaxed binding, and changing it risks breaking the Railway/Vercel deploy that already sets that variable.
- Did not rename the misspelled `Job.createAt` field. With `ddl-auto=update` against the existing cloud database, renaming would orphan the old `create_at` column and silently drop historical timestamps. Documented as a known issue instead.

**TODOs:**
- Rename `Job.createAt` → `createdAt` as part of a proper Flyway migration (don't rely on Hibernate auto-DDL for it).
- `ProdUserSeeder` seeds hardcoded demo credentials (`admin/admin123`, etc.) into production — replace with env-driven bootstrap before any real use.
- The `prod` profile keeps `ddl-auto=update` while Flyway is disabled; if Flyway is meant to own the schema, wire migrations and switch Hibernate to `validate`.
- CI runs backend tests against MariaDB while every runtime profile uses PostgreSQL — consider switching CI to Postgres for parity.
---
