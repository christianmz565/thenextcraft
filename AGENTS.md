# Repository Agent Guidelines

## Self-Hosted Architecture & Rules

This project is **strictly self-hosted** using Docker Compose. All development, testing, and deployment workflows MUST be designed around self-hosting.

- **Infrastructure Stack**:
  - Self-hosted Convex backend (`ghcr.io/get-convex/convex-backend`)
  - Self-hosted Convex dashboard (`ghcr.io/get-convex/convex-dashboard`)
  - PostgreSQL 16 database
  - MinIO object storage (S3 compatible)
- **Environment**: All local dev variables are supplied by `.env.dev` (gitignored). Keep `docker-compose.yml` as reference only and use `docker-compose.dev.yml` for dev environment.
- **Convex Tooling**:
  - Do NOT run cloud Convex commands (such as `convex dev` targeting Convex Cloud or `convex env set`).
  - Set all auth and site variables (`SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, etc.) directly in `.env.dev` / container env.
  - Frontend connects via `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_SELF_HOSTED_URL`, and `CONVEX_SELF_HOSTED_ADMIN_KEY`.
- **Package Manager**: Use `bun` exclusively (`bun install`, `bun run ...`). Never use `npm`.

---

## Launch Guide (Local Development Setup)

### 1. Start Dev Infrastructure Stack
Run Docker Compose using `.env.dev` to launch PostgreSQL, MinIO, bucket creation, Convex backend, and Convex dashboard:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml up -d
```

### 2. Check Container Health & Status
Verify that all services are running and healthy:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml ps
```

### 3. Generate Convex Admin Key
Generate the self-hosted admin key required by the frontend:

```bash
docker compose --env-file .env.dev -f docker-compose.dev.yml exec backend ./generate_admin_key.sh
```

### 4. Configure Frontend Environment (`apps/web/.env.local`)
Create or update `apps/web/.env.local` with the generated admin key:

```env
NEXT_PUBLIC_CONVEX_URL="http://127.0.0.1:3210"
CONVEX_SELF_HOSTED_URL="http://127.0.0.1:3210"
CONVEX_SELF_HOSTED_ADMIN_KEY="<admin-key-from-step-3>"
SITE_URL="http://localhost:3000"
```

### 5. Start the Web Frontend
Run the Next.js development server:

```bash
bun run dev
```

### 6. Stop or Restart Stack
- **Stop stack**: `docker compose --env-file .env.dev -f docker-compose.dev.yml stop`
- **Tear down containers**: `docker compose --env-file .env.dev -f docker-compose.dev.yml down`
- **View logs**: `docker compose --env-file .env.dev -f docker-compose.dev.yml logs -f`

---

## Service Endpoints Reference

| Service | Local Endpoint | Notes |
|---|---|---|
| **Web Frontend** | `http://localhost:3000` | Next.js app |
| **Convex Backend HTTP** | `http://127.0.0.1:3210` | Client API endpoint |
| **Convex Auth Site Origin** | `http://127.0.0.1:3211` | OAuth callback target |
| **Convex Dashboard** | `http://localhost:6791` | Self-hosted Web UI |
| **MinIO API** | `http://localhost:9000` | S3 object storage |
| **MinIO Web Console** | `http://localhost:9001` | User: `minioadmin`, Pass: `minioadmin` |
| **PostgreSQL DB** | `localhost:5432` | User: `convex`, Pass: `convex`, DB: `convex_self_hosted` |
