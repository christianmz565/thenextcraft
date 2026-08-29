# backend — Convex

Convex backend for the monorepo. Recommended workflow per https://docs.convex.dev/quickstart:

```bash
# 1. From repo root — install all deps (workspaces)
bun install

# 2. Start Convex dev sync (authenticates via GitHub, creates deployment, watches convex/ )
bun run --filter backend dev
# or
bunx --filter backend convex dev
# equivalent to `npx convex dev` at the convex.json location

# 3. One-off codegen (generates packages/backend/convex/_generated/)
bun run --filter backend codegen
```

Config:
- `convex.json` at repo root → `{ "functions": "packages/backend/convex" }` (monorepo layout per https://docs.convex.dev/quickstart/svelte `convex.json` pattern)
- `schema.ts` defines tables + indexes. Edit then `convex dev` syncs schema with zero-downtime migration.
- `_generated/` is gitignored — never hand-edit, run `convex codegen` instead.

Next steps:
- Add `auth` adapter (Convex Auth / Clerk) → `convex/auth.ts`
- Add file storage, scheduler, vector indexes as needed
