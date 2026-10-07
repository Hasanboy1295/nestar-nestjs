# Nestar API — NestJS

Real-estate platform REST API. Full rewrite of `nestar-api` (Next.js routes) in **NestJS**.

## Stack

- **NestJS 11** + **TypeScript** (Express platform)
- **PostgreSQL** via **TypeORM**
- **jose** (JWT) + **bcryptjs**, httpOnly cookie `nestar_token` (7 days)
- In-memory rate limiting, CORS whitelist, global exception filter → `{ok:false, error}`

> Data was migrated from MongoDB (messaging → PostgreSQL) with `scripts/migrate.mjs`.
> Object ids are preserved, so the API responses are identical to the old Next.js API.

## API endpoints (identical to the Next.js API)

| Method | Route | Auth | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ok, service, db, time, uptime}` |
| POST | `/api/auth/register` | — | `201 {ok, member}` + cookie |
| POST | `/api/auth/login` | — | `{ok, member}` + cookie |
| POST | `/api/auth/logout` | — | `{ok, message}` |
| GET | `/api/auth/me` | cookie | `{ok, member}` |
| PATCH | `/api/auth/me` | cookie | `{ok, member}` |
| GET | `/api/properties` | — | `{ok, total, properties[]}` |
| GET | `/api/properties/:id` | — | `{ok, property}` (+1 view) |
| GET | `/api/favorites` | cookie | `{ok, properties[]}` |
| POST | `/api/favorites/:id` | cookie | `{ok, favorite}` (toggle) |
| GET | `/api/members` | admin | `{ok, total, members[]}` |

## Local development

```bash
npm install

# 1) PostgreSQL (Docker)
docker run -d --name nestar-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=nestar123 -e POSTGRES_DB=nestar \
  -e POSTGRES_USER=nestar postgres:16

# 2) Environment
cp .env.example .env   # fill DATABASE_URL, MONGO_*, SECRET_TOKEN

# 3) One-time data migration (MongoDB → PostgreSQL)
node --env-file=.env scripts/migrate.mjs

# 4) Run
npm run build && npm start         # http://localhost:3002/api
# or with auto-reload:
npm run start:dev
```

## Environment variables (`.env`)

| Variable | Purpose |
| --- | --- |
| `PORT` | Server port (default `3002`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGO_DEV` / `MONGO_PROD` | Source MongoDB URIs (used only by the migration script) |
| `SECRET_TOKEN` | JWT signing secret |
| `ALLOWED_ORIGINS` | Comma separated CORS whitelist |
| `PG_SSL` | Set to `false` to disable SSL on `NODE_ENV=production` |

`.env` is gitignored — real values live only on your machine / VPS.

## Deployment (VPS + nginx)

See [deploy/DEPLOY.md](deploy/DEPLOY.md). Summary:

```bash
npm ci && npm run build
NODE_ENV=production node dist/main.js   # behind systemd (deploy/nestar-api.service)
# nginx proxies https://api.your-domain → 127.0.0.1:3002
```

Then point the frontend at it: Vercel → `nestar-web` → Settings → `API_URL`.

## Branches

`master` (production) and `develop` (integration).
