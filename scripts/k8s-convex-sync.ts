#!/usr/bin/env bun
/**
 * K8s self-heal: DB init + Convex deploy + env sync.
 * Hardened — no shell injection, fail-fast required env, deterministic key gen.
 * Baked into image: `bun scripts/k8s-convex-sync.ts`
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const convexUrl = process.env.CONVEX_SELF_HOSTED_URL ?? "http://thenextcraft-backend:3210";
const instanceName = process.env.INSTANCE_NAME ?? "thenextcraft";
const instanceSecret = process.env.INSTANCE_SECRET ?? "";
let adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? "";

function log(m: string): void {
  console.log(m);
}

// Small helper: spawnSync with array args only (no shell), returns result
function run(
  cmd: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string; input?: string; stdio?: "pipe" | "inherit" } = {},
) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    env: opts.env ?? process.env,
    cwd: opts.cwd,
    input: opts.input,
    stdio: opts.stdio ?? "pipe",
  });
}

function ensureDb(): void {
  const user = process.env.POSTGRES_USER;
  const pass = process.env.POSTGRES_PASSWORD;
  if (!user || !pass) {
    console.error("POSTGRES_USER and POSTGRES_PASSWORD are required (fail-fast)");
    process.exit(1);
  }
  const host = process.env.POSTGRES_HOST ?? "thenextcraft-db";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const dbName = process.env.POSTGRES_DB_NAME ?? instanceName;
  if (dbName !== instanceName) {
    log(
      `Warning: POSTGRES_DB_NAME (${dbName}) differs from INSTANCE_NAME (${instanceName}); backend derives DB from INSTANCE_NAME per docs`,
    );
  }
  const result = run(
    "psql",
    [
      "-h",
      host,
      "-p",
      port,
      "-U",
      user,
      "-d",
      "postgres",
      "-c",
      `CREATE DATABASE "${dbName}" OWNER "${user}"`,
    ],
    {
      env: { ...process.env, PGPASSWORD: pass },
    },
  );
  const out = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status === 0) log(`DB ${dbName} ensured`);
  else if (out.includes("already exists")) log(`DB ${dbName} already exists`);
  else log(`DB check: ${out.slice(0, 400)} (status ${result.status})`);
}

async function waitForBackend(url: string): Promise<boolean> {
  const versionUrl = `${url.replace(/\/$/, "")}/version`;
  for (let i = 1; i <= 30; i++) {
    try {
      const r = await fetch(versionUrl);
      if (r.ok) {
        log(`Backend ready ${r.status}`);
        return true;
      }
    } catch {}
    log(`Backend not ready ${i}/30`);
    await Bun.sleep(2000);
  }
  return false;
}

function findConvexBin(): string {
  const candidates = [
    "/app/node_modules/.bin/convex",
    path.join(import.meta.dir, "../packages/backend/node_modules/.bin/convex"),
    path.join(process.cwd(), "packages/backend/node_modules/.bin/convex"),
    path.join(process.cwd(), "node_modules/.bin/convex"),
    "convex",
  ];
  for (const p of candidates) if (p === "convex" || fs.existsSync(p)) return p;
  return "convex";
}

function generateAdminKeyLocal(): string | null {
  if (!instanceSecret) {
    console.error("INSTANCE_SECRET required to generate admin key");
    return null;
  }
  for (const b of ["/usr/local/bin/generate_key", "/convex/generate_key", "./generate_key"]) {
    if (!fs.existsSync(b)) continue;
    try {
      const r = run(b, [instanceName, instanceSecret]);
      const out = (r.stdout ?? "").trim().split("\n").pop()?.trim();
      if (r.status === 0 && out?.includes("|")) return out;
      if (r.stderr) log(`generate_key ${b} stderr: ${String(r.stderr).slice(0, 200)}`);
    } catch {}
  }
  log("generate_key binary not found, using JS HMAC fallback (no shell)");
  try {
    const hex = crypto.createHmac("sha256", instanceSecret).update(instanceName).digest("hex");
    if (hex) return `${instanceName}|${hex}`;
  } catch {}
  return null;
}

const convexBin = findConvexBin();
log(`Using convex bin: ${convexBin}`);

ensureDb();
if (!(await waitForBackend(convexUrl))) {
  console.error("Backend not ready");
  process.exit(1);
}

function tryDeploy(key: string): boolean {
  log(`Deploying to ${convexUrl} with key ${key.slice(0, 12)}...`);
  const r = run("bun", [convexBin, "deploy", "--url", convexUrl, "--admin-key", key], {
    cwd: "packages/backend",
    env: { ...process.env, CONVEX_SELF_HOSTED_URL: convexUrl, CONVEX_SELF_HOSTED_ADMIN_KEY: key },
    stdio: "inherit",
  });
  return r.status === 0;
}

const deployed = adminKey ? tryDeploy(adminKey) : false;
if (!deployed) {
  log("Deploy failed or no key, regenerating admin key...");
  const nk = generateAdminKeyLocal();
  if (!nk) {
    console.error("Failed to generate admin key");
    process.exit(1);
  }
  log(
    `New key ${nk.slice(0, 12)}... patching secret (note: secret.enc.yaml now stale — update via sops from cluster)`,
  );
  try {
    const b64 = Buffer.from(nk).toString("base64");
    const patch = JSON.stringify({ data: { CONVEX_SELF_HOSTED_ADMIN_KEY: b64 } });
    const pr = run(
      "kubectl",
      ["-n", "uni-dev", "patch", "secret", "thenextcraft-secrets", "--type", "merge", "-p", patch],
      { stdio: "inherit" },
    );
    if (pr.status !== 0)
      log(`kubectl patch failed with status ${pr.status}, continuing with in-memory key`);
    else
      log(
        "WARNING: Patched live Secret; secret.enc.yaml is now stale and must be updated via 'sops --decrypt' + re-encrypt to avoid drift",
      );
  } catch (err: unknown) {
    log(`kubectl patch failed, continuing: ${err instanceof Error ? err.message : String(err)}`);
  }
  adminKey = nk;
  if (!tryDeploy(adminKey)) {
    console.error("Retry deploy failed");
    process.exit(1);
  }
}
log("✔ Deployed Convex functions");

const requiredKeys = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "JWT_PRIVATE_KEY",
  "JWKS",
  "SITE_URL",
];
for (const k of requiredKeys) {
  if (!process.env[k]) {
    console.error(`Missing required env ${k} — aborting (Convex Auth requires it)`);
    process.exit(1);
  }
}

const envs: Array<[string, string]> = [
  ["AUTH_GOOGLE_ID", process.env.AUTH_GOOGLE_ID ?? ""],
  ["AUTH_GOOGLE_SECRET", process.env.AUTH_GOOGLE_SECRET ?? ""],
  ["SITE_URL", process.env.SITE_URL ?? ""],
  ["CONVEX_SITE_URL", process.env.CONVEX_SITE_URL ?? ""],
  ["JWT_PRIVATE_KEY", process.env.JWT_PRIVATE_KEY ?? ""],
  ["JWKS", process.env.JWKS ?? ""],
];

for (const [k, v] of envs) {
  if (!v) {
    if (k === "CONVEX_SITE_URL") {
      log(`Skipping ${k} (empty, optional)`);
      continue;
    }
    log(`Skipping ${k} (empty)`);
    continue;
  }
  log(`Setting ${k}...`);
  const r = run("bun", [convexBin, "env", "set", k, "--url", convexUrl, "--admin-key", adminKey], {
    cwd: "packages/backend",
    input: v,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`set ${k} failed`);
    process.exit(1);
  }
}

log("=== k8s convex sync complete ===");
