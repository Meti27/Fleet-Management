# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fleet Management Platform — manages drivers, trucks, and job assignments. Two deployable units in one repo:

- `backend/` — Java 21 / Spring Boot 4.0.0 REST API (Maven). Package root `com.fleet.backend`.
- `web-dashboard/` — React 19 + Vite 7 + Tailwind 3 SPA.

Cloud deployment: backend on Railway, frontend on Vercel, PostgreSQL on Neon.

## Common Commands

### Backend (`cd backend`)
- Run locally (uses `dev` profile + seeded users): `SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run`
  - Requires env: `DB_URL`, `DB_USER`, `DB_PASS`, and `SECURITY.JWT_SECRET` (note: env var name literally contains a dot — see Gotchas).
- Build + test: `./mvnw clean test`
- Run a single test: `./mvnw test -Dtest=BackendApplicationTests`
- Package jar: `./mvnw clean package`
- The JWT secret (≥32 bytes) can also be passed on the CLI: `-Dsecurity.jwt.secret=<secret>`

### Frontend (`cd web-dashboard`)
- Dev server (Vite, proxies `/api` → `localhost:8080`): `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

### Full stack via Docker
- `docker compose up --build` — starts Postgres 16 (host port 5433), backend (host port 8085), and the nginx-served frontend (host port 3000). The compose file injects all required env vars.

## Architecture

### Backend layering
Standard `Controller → Service → Repository → Entity` flow. Notable points that require reading multiple files:

- **Job lifecycle is status-history-based.** `Job.status` is a free-form `String` (e.g. `OPEN`, `ASSIGNED`, `IN_PROGRESS`), not an enum. Every status transition is recorded in a `JobStatusHistory` row by `JobServiceImpl.recordStatusChange`. All write paths (`createJob`, `updateJob`, `updateStatus`) are `@Transactional` so the job save and history insert commit or roll back together.
- **Scheduling conflict prevention** lives in `JobServiceImpl.validateNoConflicts` + the JPQL overlap queries in `JobRepository` (`findConflictingJobsForDriver` / `findConflictingJobsForTruck`). A driver cannot be double-booked across overlapping time windows; trucks are checked only against jobs in `ACTIVE_STATUSES` (`OPEN`, `ASSIGNED`, `IN_PROGRESS`). When editing a job, the current job id is passed so it doesn't conflict with itself.
- **Errors** use Spring's `ResponseStatusException` from services; `error/GlobalExceptionHandler` + `error/ApiError` shape the JSON response.
- **Fleet maintenance module** (Phase 1) — `FleetMaintenanceService` + `MaintenanceReminderService`, exposed via `TruckMaintenanceController` (`/api/trucks/{id}/{fuel-logs,maintenance,odometer,documents,schedules,summary,reminders}`) and `ReminderController` (`/api/reminders`). Entities: `FuelLog`, `MaintenanceRecord`, `OdometerReading`, `TruckDocument`, `MaintenanceSchedule`. Key invariant: fuel/maintenance odometer values are mirrored into `odometer_readings`, so "current km" = `max(reading_km)` (single source of truth). Reminders are computed (km- or time-based + document expiry), not stored. Maintenance `@ManyToOne` relations are `LAZY` + `@JsonIgnore`; reminder reads run `@Transactional(readOnly=true)` so lazy `truck` can be dereferenced while building DTOs.

### Security (stateless JWT)
- `SecurityConfig` — stateless session, CSRF off, CORS configured for the Vercel domains + `localhost:5173`. Only `/api/auth/**` and CORS preflight (`OPTIONS`) are public; everything else requires authentication. `@EnableMethodSecurity` is on.
- `JwtAuthFilter` (runs before `UsernamePasswordAuthenticationFilter`) reads the `Bearer` token, loads the user via `CustomUserDetailsService`, and populates the `SecurityContext`. Invalid tokens are swallowed silently and the request proceeds unauthenticated (method/endpoint rules then block it).
- `JwtService` validates that the secret is ≥32 bytes at startup and signs HS256 tokens carrying `role` as a claim.
- **Roles:** `ADMIN`, `DISPATCHER`, `VIEWER` (see `security/Role.java`). Authorization is enforced per-endpoint with `@PreAuthorize` on controllers (e.g. reads = `isAuthenticated()`, writes = `hasAnyRole('ADMIN','DISPATCHER')`). The README's mention of "ADMIN only" is outdated — check the actual `@PreAuthorize` annotations.

### Frontend
- `src/api.js` is the single API layer. Base URL = `VITE_API_BASE` env var, falling back to `/api` (handled by the Vite dev proxy / nginx in prod). JWT is stored in `localStorage` under `token` and attached as a `Bearer` header by `authHeaders`.
- `AuthContext.jsx` provides auth state; routing via `react-router-dom` v7. Pages map to entities: `JobsPage`, `DriversPage`, `TrucksPage`, `DashboardPage` (charts via `recharts`).

## Configuration & Profiles

**Schema is owned by Flyway** (migrations in `backend/src/main/resources/db/migration`,
`V1__baseline_schema.sql` + `V2__fleet_maintenance.sql`). Hibernate runs `ddl-auto=validate`
(set in base `application.properties`) — it only checks entities match; it does **not** create
or alter tables. To change the schema, add a new `V{n}__*.sql` file (and keep the entity in
sync, or `validate` fails at startup). `baseline-on-migrate=true` lets the existing prod DB
adopt Flyway from V1. Spring Boot 4 needs `spring-boot-flyway`, and Flyway 11 needs
`flyway-database-postgresql`, both in `pom.xml` — without them Flyway won't run.

| Profile | Used by | DB | Notes |
|---|---|---|---|
| `dev` | local | Postgres | seeds 3 users via `DevUserSeeder` + sample data |
| `ci` | not used by CI | — | the Testcontainers boot test provisions its own Postgres |
| `prod` | Railway | Neon Postgres (`SPRING_DATASOURCE_*` vars) | seeds users via `ProdUserSeeder` |

- `DevDataSeeder` / `DevUserSeeder` / `ProdUserSeeder` are `CommandLineRunner`s gated by `@Profile` that seed demo data and login users. Dev/prod seed: `admin/admin123`, `dispatcher/dispatch123`, `viewer/viewer123`.

## CI

`.github/workflows/ci.yml` runs on push to `main` and PRs: backend `mvn clean test` (the Testcontainers boot test spins up Postgres — no profile/DB service needed), frontend `npm ci && npm run build`, then a `docker compose build` of all images (gated on the prior two passing). Note CI runs `build` not `lint`; `npm run lint` currently fails on pre-existing debt in `AuthContext.jsx`/`Navbar.jsx`.

## Testing

`BackendApplicationTests` is a real `@SpringBootTest` against a Testcontainers Postgres (`@Testcontainers(disabledWithoutDocker = true)`), verifying migrations + JPA validation. To regenerate a migration that exactly matches the entities, boot Hibernate with `ddl-auto=create` against a throwaway Postgres and `pg_dump --schema-only` it (how V1/V2 were produced).

## Gotchas

- **JWT secret env var is `SECURITY.JWT_SECRET`** (with a literal dot), referenced as `${SECURITY.JWT_SECRET}` in properties; resolves from env `SECURITY_JWT_SECRET` via Spring relaxed binding. Keep the exact name when adding deploy config.
- **`mvn test` needs a reachable Docker daemon** for the boot test; it skips (green) without one. On bleeding-edge daemons Testcontainers' client may fail to negotiate the API version — that's environmental, CI is unaffected.
- **`Job.createAt`** is a misspelled column (should be `createdAt`); left as-is because renaming under Flyway needs a data-preserving migration.

## Changelog Requirement

After meaningful changes, prepend an entry to `ProjectChangelog.md` in the repo root (newest first) per the format in the global developer instructions. Skip trivial changes.
