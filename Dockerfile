# syntax=docker/dockerfile:1.16

# ─────────────────────────────────────────────────────────────
# thenextcraft — production multi-stage Dockerfile (Next.js 16 + shadcn)
#  • Bun workspaces (root + apps/web + packages/backend)
#  • Optimized layer caching via cache mounts + COPY --link
#  • Next.js standalone output for minimal runner
#  • Multi-arch ready (amd64/arm64) — oven/bun slim manifest
# ─────────────────────────────────────────────────────────────

ARG BUN_VERSION=1.3.13
ARG NODE_ENV=production

# ── base ── shared foundation ────────────────────────────────
FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV NODE_ENV=${NODE_ENV} \
    BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache

# tini = PID1 signal forwarding; curl = HEALTHCHECK
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends tini curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ── deps ── install ALL deps (dev+prod) for building ────────
FROM base AS deps

# Copy only manifests first → maximal cache hit
COPY --link package.json bun.lock ./
COPY --link apps/web/package.json ./apps/web/package.json
COPY --link packages/backend/package.json ./packages/backend/package.json

RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install,sharing=locked \
    --mount=type=cache,target=/root/.cache/bun,id=bun-cache,sharing=locked \
    bun install --frozen-lockfile --ignore-scripts

# ── builder ── build Next.js (standalone) ───────────────────
FROM base AS builder
WORKDIR /app

# Bring hoisted node_modules (Bun workspaces hoist to root)
COPY --from=deps --link /app/node_modules ./node_modules
COPY --from=deps --link /app/bun.lock ./bun.lock
COPY --from=deps --link /app/package.json ./package.json
COPY --from=deps --link /app/apps ./apps
COPY --from=deps --link /app/packages ./packages

# Copy sources last — changing code won't invalidate deps layer
COPY --link . .

# Cache Next.js build cache + Bun cache
RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install,sharing=locked \
    --mount=type=cache,target=/root/.cache/bun,id=bun-cache,sharing=locked \
    --mount=type=cache,target=/app/apps/web/.next/cache,id=next-cache,sharing=locked \
    --mount=type=cache,target=/app/node_modules/.cache,id=build-cache,sharing=locked \
    --mount=type=cache,target=/app/apps/web/node_modules/.cache,id=web-build-cache,sharing=locked \
    bun run --filter web build

# ── runner ── minimal production image (standalone) ─────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js standalone output is self-contained.
# For monorepo, standalone is at apps/web/.next/standalone with server at apps/web/server.js
COPY --from=builder --link /app/apps/web/.next/standalone ./
# Static assets and public are NOT included in standalone — copy them explicitly
COPY --from=builder --link /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --link /app/apps/web/public ./apps/web/public

# If you keep packages/backend for non-container usage, copy it (optional, not needed for Next.js runtime)
COPY --from=builder --link /app/packages ./packages

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["tini", "--"]

# Next.js standalone server — `apps/web/server.js` inside standalone root `/app`
CMD ["bun", "apps/web/server.js"]

LABEL org.opencontainers.image.title="thenextcraft" \
      org.opencontainers.image.description="thenextcraft web container (Next.js 16 + shadcn)" \
      org.opencontainers.image.source="https://github.com/christianmz565/thenextcraft"
