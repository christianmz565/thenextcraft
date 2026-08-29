ARG BUN_VERSION=1.3.13
ARG NODE_ENV=production

FROM oven/bun:${BUN_VERSION}-slim AS base
ARG NODE_ENV=production
WORKDIR /app
ENV NODE_ENV=${NODE_ENV} \
    BUN_INSTALL_CACHE_DIR=/root/.bun/install/cache

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends tini curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

FROM base AS deps

COPY --link package.json bun.lock ./
COPY --link apps/web/package.json ./apps/web/package.json
COPY --link packages/backend/package.json ./packages/backend/package.json

RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install,sharing=locked \
    --mount=type=cache,target=/root/.cache/bun,id=bun-cache,sharing=locked \
    bun install --frozen-lockfile --ignore-scripts

FROM base AS builder
ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL} \
    SKIP_ENV_VALIDATION=1
WORKDIR /app
COPY --from=deps --link /app/node_modules ./node_modules
COPY --from=deps --link /app/bun.lock ./bun.lock
COPY --from=deps --link /app/package.json ./package.json
COPY --from=deps --link /app/apps ./apps
COPY --from=deps --link /app/packages ./packages

COPY --link . .

RUN --mount=type=cache,target=/root/.bun/install/cache,id=bun-install,sharing=locked \
    --mount=type=cache,target=/root/.cache/bun,id=bun-cache,sharing=locked \
    --mount=type=cache,target=/app/apps/web/.next/cache,id=next-cache,sharing=locked \
    --mount=type=cache,target=/app/node_modules/.cache,id=build-cache,sharing=locked \
    --mount=type=cache,target=/app/apps/web/node_modules/.cache,id=web-build-cache,sharing=locked \
    bun run --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# K8s sync deps: psql + kubectl + generate_key (so Job can run `bun scripts/k8s-convex-sync.ts` without clone/install)
USER root
RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends postgresql-client openssl \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$(dpkg --print-architecture)/kubectl" \
    && chmod +x kubectl && mv kubectl /usr/local/bin/ \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/get-convex/convex-backend:latest /convex/generate_key /usr/local/bin/generate_key
RUN chmod +x /usr/local/bin/generate_key

COPY --from=builder --link /app/apps/web/.next/standalone ./
COPY --from=builder --link /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --link /app/apps/web/public ./apps/web/public

COPY --from=builder --link /app/tsconfig.json ./tsconfig.json
COPY --from=builder --link /app/packages ./packages
COPY --from=builder --link /app/scripts ./scripts
COPY --from=builder --link /app/node_modules ./node_modules
COPY --from=builder --link /app/package.json ./package.json
COPY --from=builder --link /app/bun.lock ./bun.lock

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["tini", "--"]

CMD ["bun", "apps/web/server.js"]

LABEL org.opencontainers.image.title="thenextcraft" \
      org.opencontainers.image.description="thenextcraft web container (Next.js 16 + shadcn)" \
      org.opencontainers.image.source="https://github.com/christianmz565/thenextcraft"
