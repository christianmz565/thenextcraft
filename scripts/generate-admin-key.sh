#!/usr/bin/env bash
set -euo pipefail

ADMIN_KEY=$(docker compose --env-file .env.dev -f docker-compose.dev.yml exec -T backend ./generate_admin_key.sh | tr -d '\r')

echo "Generated Convex Admin Key: ${ADMIN_KEY}"

ENV_LOCAL="apps/web/.env.local"
if [ -f "$ENV_LOCAL" ]; then
  if grep -q "CONVEX_SELF_HOSTED_ADMIN_KEY=" "$ENV_LOCAL"; then
    sed -i "s#^CONVEX_SELF_HOSTED_ADMIN_KEY=.*#CONVEX_SELF_HOSTED_ADMIN_KEY=\"${ADMIN_KEY}\"#" "$ENV_LOCAL"
  else
    echo "CONVEX_SELF_HOSTED_ADMIN_KEY=\"${ADMIN_KEY}\"" >> "$ENV_LOCAL"
  fi
fi

if [ -f ".env.dev" ]; then
  GOOGLE_CLIENT_VAL=$(grep -E '^(AUTH_GOOGLE_ID|GOOGLE_CLIENT)=' .env.dev | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  GOOGLE_SECRET_VAL=$(grep -E '^(AUTH_GOOGLE_SECRET|GOOGLE_SECRET)=' .env.dev | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  SITE_URL_VAL=$(grep -E '^SITE_URL=' .env.dev | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
  CONVEX_URL_VAL=$(grep -E '^CONVEX_SELF_HOSTED_URL=' .env.dev | head -n 1 | cut -d '=' -f 2- | tr -d '"' | tr -d "'")
fi

GOOGLE_CLIENT_VAL="${GOOGLE_CLIENT_VAL:-${AUTH_GOOGLE_ID:-${GOOGLE_CLIENT:-}}}"
GOOGLE_SECRET_VAL="${GOOGLE_SECRET_VAL:-${AUTH_GOOGLE_SECRET:-${GOOGLE_SECRET:-}}}"
SITE_URL_VAL="${SITE_URL_VAL:-${SITE_URL:-http://localhost:3000}}"
CONVEX_URL_VAL="${CONVEX_URL_VAL:-${CONVEX_SELF_HOSTED_URL:-http://127.0.0.1:3210}}"

if [ -n "$GOOGLE_CLIENT_VAL" ] && [ -n "$GOOGLE_SECRET_VAL" ]; then
  echo "Syncing Auth env vars to self-hosted Convex backend..."
  (cd packages/backend && bun node_modules/.bin/convex env set AUTH_GOOGLE_ID "$GOOGLE_CLIENT_VAL" --url "$CONVEX_URL_VAL" --admin-key "$ADMIN_KEY")
  (cd packages/backend && bun node_modules/.bin/convex env set AUTH_GOOGLE_SECRET "$GOOGLE_SECRET_VAL" --url "$CONVEX_URL_VAL" --admin-key "$ADMIN_KEY")
  (cd packages/backend && bun node_modules/.bin/convex env set SITE_URL "$SITE_URL_VAL" --url "$CONVEX_URL_VAL" --admin-key "$ADMIN_KEY")
  echo "Convex environment variables successfully synced!"
fi
