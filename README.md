# 🚚 Fleet Management Platform

A full-stack fleet management system for an infrastructure/logistics company. It lets an
operator manage **drivers**, **trucks**, and **jobs**, assign work without double-booking
people or vehicles, track each job's lifecycle through a status history, log **fleet health**
(fuel, maintenance, odometer, documents) with **preventive-maintenance reminders**, and view
operational metrics on a dashboard — all behind stateless JWT authentication.

Units are metric (km, litres) and **EUR** throughout (built for the North Macedonia market).

| Layer | Tech | Hosting |
|-------|------|---------|
| Frontend | React 19, Vite 7, Tailwind 3, Recharts | Vercel |
| Backend | Java 21, Spring Boot 4, Spring Security, Spring Data JPA | Railway |
| Database | PostgreSQL | Neon |
| Tooling | Docker Compose, GitHub Actions CI | — |

---

## Table of Contents
- [Architecture](#architecture)
- [Domain Model](#domain-model)
- [Key Behaviors](#key-behaviors)
- [Security & Roles](#security--roles)
- [API Reference](#api-reference)
- [Configuration & Profiles](#configuration--profiles)
- [Running Locally](#running-locally)
- [Running with Docker](#running-with-docker)
- [Testing & CI](#testing--ci)
- [Deployment](#deployment)
- [Known Issues / Roadmap](#known-issues--roadmap)

---

## Architecture

```
┌────────────┐      HTTPS / JWT      ┌──────────────────────────────┐     JDBC    ┌──────────┐
│  React SPA │  ───────────────────▶ │  Spring Boot API (Railway)   │ ──────────▶ │  Neon PG │
│  (Vercel)  │ ◀───────────────────  │  Controller→Service→Repo     │             └──────────┘
└────────────┘     JSON responses    └──────────────────────────────┘
```

The backend follows a classic layered design:

```
Controller  →  Service  →  Repository  →  Entity / Database
   REST        business     Spring Data    JPA-mapped
  endpoints      logic        (JPA)         domain
```

- **Controllers** (`controller/`) expose REST endpoints and declare per-endpoint
  authorization with `@PreAuthorize`.
- **Services** (`service/`) hold business logic and transactions. The core logic lives in
  `JobServiceImpl`.
- **Repositories** (`repository/`) are Spring Data JPA interfaces, including custom JPQL
  for conflict detection.
- **Security** (`security/`) implements the stateless JWT filter chain.
- **Errors** (`error/`) centralize exception-to-JSON mapping via `GlobalExceptionHandler`.

---

## Domain Model

| Entity | Notes |
|--------|-------|
| `Driver` | name, phone, email, license, status (`ACTIVE` default) |
| `Truck` | unique plate number, model, capacity (tons), status (`AVAILABLE` default) |
| `Job` | title, pickup/dropoff location & time, price (EUR), status, optional driver & truck |
| `JobStatusHistory` | append-only log of every status transition for a job |
| `AppUser` | username, BCrypt password hash, role |
| `FuelLog` | refuelling: litres, cost, odometer, station, optional driver |
| `MaintenanceRecord` | service event: type, date, odometer, cost, vendor, notes |
| `OdometerReading` | km reading (manual, or mirrored from fuel/maintenance) — source of truth for "current km" |
| `TruckDocument` | registration/insurance/inspection with an expiry date |
| `MaintenanceSchedule` | preventive rule per (truck, type): every N km and/or N months |

Job status is a string moving through values such as `OPEN → ASSIGNED → IN_PROGRESS → DONE`
(or `CANCELLED`). Rather than mutating a single field silently, **every transition writes a
`JobStatusHistory` row**, giving a full audit trail.

---

## Key Behaviors

- **Conflict prevention** — A job cannot be created or updated if its driver or truck is
  already booked in an overlapping time window. The overlap check is implemented as JPQL in
  `JobRepository` (`findConflictingJobsForDriver` / `findConflictingJobsForTruck`) and
  enforced in `JobServiceImpl.validateNoConflicts`. Trucks are only considered "busy" for
  jobs in active statuses (`OPEN`, `ASSIGNED`, `IN_PROGRESS`); when editing, a job is
  excluded from conflicting with itself.
- **Transactional writes** — `createJob`, `updateJob`, and `updateStatus` are
  `@Transactional`, so the job row and its history row commit or roll back together.
- **Dashboard metrics** — `/api/dashboard/summary` aggregates totals, active/completed/
  cancelled counts, available drivers & trucks, and total / last-30-days revenue.
- **Fleet health logging** — per-truck fuel, maintenance, odometer and document records.
  Any fuel/maintenance entry with an odometer value is mirrored into `odometer_readings`,
  so the truck's current km always has a single source of truth. The truck summary computes
  total fuel/maintenance spend and average fuel efficiency (L/100km).
- **Preventive reminders** — `MaintenanceReminderService` flags maintenance that is due by
  kilometres (current km vs. last service + interval) or by time (last service + interval
  months), and documents nearing/over expiry, as `DUE_SOON` / `OVERDUE`. Surfaced fleet-wide
  on the dashboard and per-truck on the truck page.

---

## Security & Roles

- **Stateless JWT** — login returns a signed HS256 token; clients send it as
  `Authorization: Bearer <token>`. No server-side sessions.
- `JwtAuthFilter` validates the token and populates the security context on each request.
  `JwtService` enforces a minimum 32-byte secret at startup.
- **BCrypt** password hashing.
- **Roles** (`ADMIN`, `DISPATCHER`, `VIEWER`) are enforced per-endpoint with
  `@PreAuthorize`:
  - Reads (`GET`) — any authenticated user.
  - Writes (`POST`/`PUT`/`PATCH`/`DELETE`) — `ADMIN` or `DISPATCHER`.
- **CORS** is configured centrally in `SecurityConfig` (allows the Vercel domains +
  `localhost:5173`, with credentials). Controllers no longer carry their own
  `@CrossOrigin`.
- Public endpoints: `POST /api/auth/login`, `GET /api/health`, and CORS preflight.

---

## API Reference

Base path: `/api`

### Auth
| Method | Path | Auth | Body / Notes |
|--------|------|------|--------------|
| POST | `/auth/login` | public | `{ "username", "password" }` → `{ token, username, role }` |

### Health
| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | public |

### Jobs
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/jobs` | authenticated | list |
| GET | `/jobs/{id}` | authenticated | one |
| POST | `/jobs` | ADMIN/DISPATCHER | create (conflict-checked) |
| PUT | `/jobs/{id}` | ADMIN/DISPATCHER | update (conflict-checked) |
| PATCH | `/jobs/{id}/status?status=...` | ADMIN/DISPATCHER | transition status |
| DELETE | `/jobs/{id}` | ADMIN/DISPATCHER | delete + history cleanup |
| GET | `/jobs/{id}/history` | authenticated | status history |

### Drivers / Trucks
| Method | Path | Auth |
|--------|------|------|
| GET | `/drivers`, `/drivers/{id}` · `/trucks`, `/trucks/{id}` | authenticated |
| POST | `/drivers` · `/trucks` | ADMIN/DISPATCHER |
| PUT | `/drivers/{id}` · `/trucks/{id}` | ADMIN/DISPATCHER |
| DELETE | `/drivers/{id}` · `/trucks/{id}` | ADMIN/DISPATCHER |

### Dashboard
| Method | Path | Auth |
|--------|------|------|
| GET | `/dashboard/summary` | authenticated |

### Fleet maintenance (truck-scoped under `/trucks/{id}`)
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/trucks/{id}/summary` | authenticated | current km, spend, efficiency, open alerts |
| GET | `/trucks/{id}/reminders` | authenticated | reminders for this truck |
| GET·POST | `/trucks/{id}/fuel-logs` | read·ADMIN/DISPATCHER | DELETE `/fuel-logs/{logId}` |
| GET·POST | `/trucks/{id}/maintenance` | read·ADMIN/DISPATCHER | DELETE `/maintenance/{recId}` |
| GET·POST | `/trucks/{id}/odometer` | read·ADMIN/DISPATCHER | manual km readings |
| GET·POST | `/trucks/{id}/documents` | read·ADMIN/DISPATCHER | DELETE `/documents/{docId}` |
| GET·PUT | `/trucks/{id}/schedules` | read·ADMIN/DISPATCHER | PUT upserts by type; DELETE `/schedules/{schedId}` |

### Reminders (fleet-wide)
| Method | Path | Auth |
|--------|------|------|
| GET | `/reminders` | authenticated |

---

## Configuration & Profiles

Selected via `SPRING_PROFILES_ACTIVE`:

| Profile | Use | Database | Notes |
|---------|-----|----------|-------|
| `dev` | local development | PostgreSQL | seeds demo users & data |
| `ci` | (unused by CI) | — | the boot test self-provisions Postgres via Testcontainers |
| `prod` | Railway | Neon PostgreSQL | datasource from `SPRING_DATASOURCE_*` |

**Schema is owned by Flyway.** Migrations live in `backend/src/main/resources/db/migration`
(`V1__baseline_schema.sql`, `V2__fleet_maintenance.sql`); Hibernate runs with
`ddl-auto=validate` and only checks that the entities match. On a fresh database Flyway runs
all migrations; on the existing prod database `baseline-on-migrate` adopts it from V1 and
applies later migrations on top. To add a schema change, add a new `V{n}__*.sql` file.

**Environment variables**

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SECURITY_JWT_SECRET` | all | JWT signing secret (≥ 32 bytes). Referenced in properties as `${SECURITY.JWT_SECRET}`; resolved via Spring relaxed binding. |
| `SECURITY_JWT_EXP_MINUTES` | all | Token lifetime (default `120`). |
| `DB_URL` / `DB_USER` / `DB_PASS` | dev, ci | JDBC connection. |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | prod | Neon connection (set in Railway). |
| `PORT` | prod | Server port (default `8080`). |

The frontend reads `VITE_API_BASE` (falls back to `/api`, which the Vite dev server and the
production nginx both proxy to the backend).

---

## Running Locally

**Prerequisites:** JDK 21, Node 20+, a PostgreSQL instance (or use the Docker DB below).

### Backend
```bash
cd backend
export SECURITY_JWT_SECRET=$(openssl rand -hex 32)
export DB_URL=jdbc:postgresql://localhost:5432/fleetdb
export DB_USER=fleet_user
export DB_PASS=yourpassword
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run
```
The `dev` profile seeds demo logins: `admin/admin123`, `dispatcher/dispatch123`,
`viewer/viewer123`, plus sample drivers and trucks. API is served on `http://localhost:8080`.

### Frontend
```bash
cd web-dashboard
npm install
npm run dev          # http://localhost:5173, proxies /api → :8080
```

---

## Running with Docker

Brings up PostgreSQL, the backend, and the nginx-served frontend together:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:8085 |
| Postgres | localhost:5433 |

All required environment variables are wired in `docker-compose.yml`.

---

## Testing & CI

```bash
cd backend
./mvnw clean test                       # all backend tests
./mvnw test -Dtest=BackendApplicationTests   # a single test class
```

`BackendApplicationTests` boots the full app against a throwaway PostgreSQL container
(Testcontainers), which verifies the Flyway migrations apply and every JPA entity validates
against the schema. It needs a reachable Docker daemon; without one it skips (so the build
stays green) and runs for real in CI.

```bash
cd web-dashboard
npm run lint
npm run build
```

GitHub Actions (`.github/workflows/ci.yml`) runs on pushes to `main` and on PRs:
1. **Backend** — `mvn clean test` (the boot test spins up Postgres via Testcontainers).
2. **Frontend** — `npm ci && npm run build`.
3. **Docker** — `docker compose build` of all images (gated on the two builds passing).

---

## Deployment

| Layer | Platform | Notes |
|-------|----------|-------|
| Frontend | Vercel | Production React build; set `VITE_API_BASE` to the backend URL. |
| Backend | Railway | Set `SECURITY_JWT_SECRET`, `SPRING_DATASOURCE_*`, `SPRING_PROFILES_ACTIVE=prod`. |
| Database | Neon | Managed PostgreSQL; connection string injected via env vars. |

Secrets are never hardcoded — all credentials come from environment variables.

---

## Roadmap

This is being built in phases toward a pitch-ready product. See `ProjectChangelog.md` for detail.

- ✅ **Phase 0 — Foundations:** Flyway-owned schema + Testcontainers verification.
- ✅ **Phase 1 — Fleet maintenance logging:** fuel, maintenance, odometer, documents, reminders.
- ⏭️ **Phase 2 — Driver app:** `DRIVER` role + Driver↔User link, job state machine, start/finish jobs, in-app notifications (React Native / Expo).
- ⏭️ **Phase 3 — Live GPS tracking** · **Phase 4 — Background push** (Expo/FCM).

### Known issues / tech debt

- `Job.createAt` field is misspelled; rename to `createdAt` via a Flyway migration (a bare
  rename would orphan the existing column).
- `ProdUserSeeder` seeds hardcoded demo credentials into production — move to an
  env-driven bootstrap before real use.
- `mvn test` only *runs* the boot/migration test where Docker is reachable; it skips on
  daemons whose API version Testcontainers' client can't negotiate (runs in CI).
- Pre-existing frontend lint errors in `AuthContext.jsx` / `Navbar.jsx` (`npm run lint`
  fails; `npm run build`, which CI gates, passes).
- Maintenance/document `type` values are free strings by convention (no enum constraint).

---

> Built as an academic project that deliberately goes beyond basic CRUD — emphasizing
> secure, transactional, cloud-deployed full-stack architecture.
