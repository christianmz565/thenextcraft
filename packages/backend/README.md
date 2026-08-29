# backend — Convex

Convex backend for the monorepo. Recommended workflow per https://docs.convex.dev/quickstart:

```bash
bun install

bun run --filter backend dev
bunx --filter backend convex dev

bun run --filter backend codegen
```

Config:
- `convex.json` at repo root → `{ "functions": "packages/backend/convex" }` (monorepo layout per https://docs.convex.dev/quickstart/svelte `convex.json` pattern)
- `schema.ts` defines tables + indexes. Edit then `convex dev` syncs schema with zero-downtime migration.
- `_generated/` is committed to git — never hand-edit, generated automatically during dev or with `bun run convex:codegen`.

## Auth — Convex Auth + Google OAuth

Google OAuth only via `@convex-dev/auth@0.0.95` + `@auth/core@0.41.1`. Providers configured in `convex/auth.ts`, routes mounted in `convex/http.ts` at `https://<deployment>.convex.site/api/auth/*`.

### Google Cloud setup

1. Google Cloud Console → APIs & Services → OAuth consent screen → create (External, add test users if needed).
2. Credentials → Create Credentials → OAuth client ID → Web application.
3. Authorized redirect URI: `https://<deployment>.convex.site/api/auth/callback/google` — get `<deployment>` from `bunx --cwd packages/backend convex dev` logs or dashboard URL (`*.convex.site`).
4. Copy Client ID → `AUTH_GOOGLE_ID`, Client Secret → `AUTH_GOOGLE_SECRET`.

### Env vars

```bash
# From repo root or packages/backend
bunx --cwd packages/backend convex env set AUTH_GOOGLE_ID "<your-client-id>"
bunx --cwd packages/backend convex env set AUTH_GOOGLE_SECRET "<your-client-secret>"
bunx --cwd packages/backend convex env set SITE_URL "http://localhost:3000" # prod: canonical URL
bunx --cwd packages/backend convex env list # verify
```

Local `.env` also needs `SITE_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (see `.env.example`). `SITE_URL` controls post-auth redirect; the Convex deployment's `*.convex.site` handles the OAuth callback.

### Schema & indexes

- `schema.ts` extends `authTables` with extensible `users` (`name`, `image`, `email`, etc.) and user-scoped `tasks` (`userId`, indexes `by_user`, `by_user_completed`).
- Existing `tasks` rows without `userId` must be cleared/migrated before enforcing non-optional `userId` (dev DB: delete rows; prod: one-off migration deleting or assigning owner).

### Self-hosted backend (Docker / own infra)

If you self-host Convex (see `https://github.com/get-convex/convex-backend` self-hosted guide), the setup above still applies but with differences:

- **Deployment:** `docker compose up` starts backend at `http://127.0.0.1:3210`, HTTP actions at `http://127.0.0.1:3211`, dashboard at `http://localhost:6791`. Generate admin key with `docker compose exec backend ./generate_admin_key.sh`.
- **Frontend env:** Do **not** use `CONVEX_DEPLOYMENT` / `CONVEX_DEPLOY_KEY`. Instead set in `apps/web/.env.local` / hosting provider:

  ```sh
  NEXT_PUBLIC_CONVEX_URL="http://127.0.0.1:3210" # or your self-hosted URL
  CONVEX_SELF_HOSTED_URL="http://127.0.0.1:3210"
  CONVEX_SELF_HOSTED_ADMIN_KEY="<from generate_admin_key.sh>"
  SITE_URL="http://localhost:3000" # your frontend origin
  ```

  For production hosting (Vercel/Netlify etc.) set `CONVEX_SELF_HOSTED_URL` + `CONVEX_SELF_HOSTED_ADMIN_KEY` instead of `CONVEX_DEPLOY_KEY` per https://docs.convex.dev/production/hosting/.
- **Convex Auth env setup:** Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL`, `JWT_PRIVATE_KEY`, and `JWKS` in the self-hosted Convex backend via `bun run convex:admin-key` (or `convex env set <KEY> --url http://127.0.0.1:3210 --admin-key <admin-key>`). Setting process/container environment variables in `docker-compose.yml` does not inject them into the V8 function runtime where Convex Auth executes.
- **OAuth redirect URI:** For self-hosted, authorized redirect becomes `http://<your-backend-host>:3211/api/auth/callback/google` (or `https://<your-domain>/api/auth/callback/google` if behind a proxy) instead of `https://<deployment>.convex.site/api/auth/callback/google`. Update the Google Cloud OAuth Client accordingly and ensure `SITE_URL` matches your frontend origin.
- **Reference:** Self-hosted guide in repo attachment / https://github.com/get-convex/convex-backend/blob/main/self-hosted/docker/docker-compose.yml and `advanced/` docs for Postgres/MySQL and S3 storage.
