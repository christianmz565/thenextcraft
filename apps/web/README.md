# web — frontend placeholder

This directory is reserved for the frontend framework.

> Do not `rm -rf` — init your framework here, e.g.:

```bash
# Next.js (recommended with Convex)
bunx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*"

# Vite + React
bun create vite . --template react-ts

# Svelte / Nuxt / Astro — pick one and init in-place
```

Existing monorepo wiring:
- Root `tsconfig.json` is strict and referenced (`references: ./apps/web`)
- Root `biome.json` covers this folder (formatter + linter + organizeImports)
- Run `bun run typecheck` from root to type-check the whole workspace
