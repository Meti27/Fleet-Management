# Deploying Fleet Management to Railway + Vercel

This guide deploys the full stack:

```
Vercel (React SPA)  ──HTTPS/WSS──►  Railway: backend (Spring Boot)  ──►  Railway: PostgreSQL
```

- **Backend** → Railway (Docker, uses `backend/Dockerfile`)
- **Database** → Railway PostgreSQL (same project, private networking)
- **Frontend** → Vercel (static build of `web-dashboard/`)

Everything here matches this repo's config — the backend already binds Railway's
`$PORT`, Flyway builds the schema on first boot, and the `prod` profile seeds the
full demo dataset (7 drivers, 6 trucks, 33 jobs, plus login users).

---

## 0. Prerequisites

- A Railway account (Hobby plan is fine) and the repo pushed to GitHub.
- A Vercel account.
- A JWT secret of **at least 32 characters**. Generate one:
  ```bash
  openssl rand -hex 32
  ```
  Keep it somewhere safe — you'll paste it into Railway.

---

## 1. Create the Railway project + PostgreSQL

1. Go to **railway.app → New Project**.
2. Choose **Provision PostgreSQL** (or New Project → empty, then **+ New → Database → Add PostgreSQL**).
3. You now have a `Postgres` service. Railway auto-creates these variables on it:
   `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DATABASE_URL`.

> Keep the database in the **same project** as the backend so they share Railway's
> private network — no public connection string or SSL flags needed.

---

## 2. Deploy the backend service

1. In the same project: **+ New → GitHub Repo →** select this repository.
2. Open the new service → **Settings**:
   - **Root Directory**: `backend`
     *(This is essential — the Dockerfile lives in `backend/`.)*
   - **Builder**: Railway auto-detects the `Dockerfile`. Leave it on Dockerfile.
   - Networking: under **Settings → Networking**, click **Generate Domain** to get a
     public URL like `https://fleet-backend-production.up.railway.app`.
     Note this URL — the frontend needs it.

3. Open the backend service → **Variables** and add the following.
   Use Railway **reference variables** (`${{Postgres.VAR}}`) so the DB values wire
   automatically — type them exactly, including the `${{ }}`:

   | Variable | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `SPRING_DATASOURCE_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
   | `SPRING_DATASOURCE_USERNAME` | `${{Postgres.PGUSER}}` |
   | `SPRING_DATASOURCE_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
   | `SECURITY_JWT_SECRET` | *your 32+ char secret from step 0* |

   > **If your Postgres service isn't named `Postgres`**, replace `Postgres` in the
   > references with its actual name (see the service's title in the canvas).

   > **Do not** set `PORT` or `SERVER_PORT` — Railway injects `PORT` and the app
   > already reads it (`server.port=${PORT:8080}`).

4. The service redeploys. Watch **Deployments → View Logs**. On a healthy first boot
   you'll see Flyway run and the app start:
   ```
   Flyway ... Successfully applied 5 migrations to schema "public", now at version v5
   Tomcat started on port <PORT>
   Started BackendApplication in N seconds
   ```
   The `prod` seeders then populate users + demo fleet data (idempotent — only on an
   empty DB).

---

## 3. Deploy the frontend to Vercel

1. **vercel.com → Add New → Project →** import this repo.
2. Configure the project:
   - **Root Directory**: `web-dashboard`
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Add an **Environment Variable**:

   | Name | Value |
   |---|---|
   | `VITE_API_BASE` | `https://<your-backend>.up.railway.app/api` |

   Use the Railway backend domain from step 2.2, with `/api` appended.
   The live-map WebSocket URL is derived from this automatically (it becomes
   `wss://<your-backend>.up.railway.app/ws`).

4. **Deploy.** Your frontend lands on a URL like `https://fleet-management-sable.vercel.app`.

> **CORS / WebSocket origins:** the backend already allows
> `https://fleet-management-sable.vercel.app` and the `https://fleet-management-*.vercel.app`
> wildcard (see `SecurityConfig.java` + `WebSocketConfig.java`). If your Vercel
> domain is **different**, add it to both files' allowed-origin lists and redeploy
> the backend — otherwise login and the live map get blocked.

---

## 4. Verify

1. Open the Vercel URL and log in with a seeded account:

   | Username | Password | Role |
   |---|---|---|
   | `admin` | `admin123` | ADMIN |
   | `dispatcher` | `dispatch123` | DISPATCHER |
   | `viewer` | `viewer123` | VIEWER |
   | `driver` | `driver123` | DRIVER (driver app) |

2. Confirm the dashboard shows populated KPIs/charts, Jobs lists ~33 jobs, Trucks/Drivers
   are filled, and the **Live Map** page connects (WebSocket).
3. Quick API smoke test from your machine (replace the host):
   ```bash
   BACKEND=https://<your-backend>.up.railway.app
   # login
   curl -s -X POST $BACKEND/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"admin123"}'
   ```
   You should get a JSON body with a `token`.

---

## 5. Going further (optional)

- **Custom domain**: add it in Railway (backend) / Vercel (frontend). For a custom
  *frontend* domain, also add it to the allowed-origin lists in `SecurityConfig.java`
  and `WebSocketConfig.java`, then redeploy the backend.
- **Auto-deploy**: both Railway and Vercel redeploy on push to `main` by default.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Backend deploy build fails immediately | Root Directory not set to `backend` (Dockerfile not found). |
| App starts then exits; logs mention JWT secret length | `SECURITY_JWT_SECRET` missing or under 32 chars. Note the env name uses **underscores** — it maps to the `${SECURITY.JWT_SECRET}` property (literal dot) via Spring relaxed binding. |
| `Flyway ... validate failed` or migration error | DB isn't empty / has a conflicting schema. Use a fresh Railway Postgres, or reset it. On an existing prod DB, `baseline-on-migrate=true` adopts Flyway from V1. |
| Connection refused / auth failed to DB | Check the `${{Postgres.*}}` references resolve (correct service name). The URL must be the **JDBC** form (`jdbc:postgresql://...`), not Railway's raw `postgres://` `DATABASE_URL`. |
| Login works but dashboard is empty | Wrong profile. Demo data only seeds under `prod` (or `dev`). Confirm `SPRING_PROFILES_ACTIVE=prod`. Seeding only runs on an **empty** DB. |
| Frontend loads but every API call fails (CORS) | Vercel domain not in the backend allow-list. Add it to `SecurityConfig.java` + `WebSocketConfig.java` and redeploy backend. Also confirm `VITE_API_BASE` points at the backend `/api`. |
| Live map never connects | `wss://` blocked — same CORS/origin fix as above. The WS path is `/ws`, derived from `VITE_API_BASE`. |
| 502 right after deploy | App still starting (Flyway + boot take a few seconds) — wait and refresh. |

---

## Reference: required backend env vars (copy/paste)

```
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
SPRING_DATASOURCE_USERNAME=${{Postgres.PGUSER}}
SPRING_DATASOURCE_PASSWORD=${{Postgres.PGPASSWORD}}
SECURITY_JWT_SECRET=<your-32+-char-secret>
```

Frontend (Vercel):
```
VITE_API_BASE=https://<your-backend>.up.railway.app/api
```

> ⚠️ The seeded logins above are **demo credentials hardcoded in the seeders**
> (`ProdUserSeeder` / `DevDataSeeder`). Change them before any real, customer-facing
> deployment.
