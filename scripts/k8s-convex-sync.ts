#!/usr/bin/env bun
/**
 * K8s self-heal: DB init + Convex deploy + env sync.
 * Generic — all values via env, no hardcoding.
 * Baked into image: `bun scripts/k8s-convex-sync.ts`
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const convexUrl = process.env.CONVEX_SELF_HOSTED_URL ?? "http://thenextcraft-backend:3210";
const instanceName = process.env.INSTANCE_NAME ?? "thenextcraft";
const instanceSecret = process.env.INSTANCE_SECRET ?? "";
let adminKey = process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ?? "";

function log(m: string): void {
  console.log(m);
}

function ensureDb(): void {
  const user = process.env.POSTGRES_USER ?? "convex";
  const pass = process.env.POSTGRES_PASSWORD ?? "";
  const host = process.env.POSTGRES_HOST ?? "thenextcraft-db";
  const port = process.env.POSTGRES_PORT ?? "5432";
  const dbName = process.env.POSTGRES_DB_NAME ?? "thenextcraft";
  try {
    execSync(
      `PGPASSWORD="${pass}" psql -h ${host} -p ${port} -U "${user}" -d postgres -c "CREATE DATABASE \\"${dbName}\\" OWNER \\"${user}\\""`,
      { stdio: "pipe" },
    );
    log(`DB ${dbName} ensured`);
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
    const out = `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}${e.message ?? ""}`;
    if (out.includes("already exists")) log(`DB ${dbName} already exists`);
    else log(`DB check: ${out.slice(0, 400)}`);
  }
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
    } catch {
      // retry
    }
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
  for (const p of candidates) {
    if (p === "convex" || fs.existsSync(p)) return p;
  }
  return "convex";
}

function generateAdminKeyLocal(): string | null {
  const bins = ["/usr/local/bin/generate_key", "/convex/generate_key", "./generate_key"];
  for (const b of bins) {
    if (fs.existsSync(b)) {
      try {
        const out = execSync(`${b} "${instanceName}" "${instanceSecret}"`, {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .pop()
          ?.trim();
        if (out && out.includes("|")) return out;
      } catch {
        // try next
      }
    }
  }
  try {
    const hex = execSync(
      `printf "%s" "${instanceName}" | openssl dgst -sha256 -hmac "${instanceSecret}" | awk '{print $2}'`,
      { encoding: "utf8" },
    ).trim();
    if (hex) return `${instanceName}|${hex}`;
  } catch {
    // ignore
  }
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
  const r = spawnSync("bun", [convexBin, "deploy", "--url", convexUrl, "--admin-key", key], {
    cwd: "packages/backend",
    stdio: "inherit",
    env: { ...process.env, CONVEX_SELF_HOSTED_URL: convexUrl, CONVEX_SELF_HOSTED_ADMIN_KEY: key },
  });
  return r.status === 0;
}

let deployed = adminKey ? tryDeploy(adminKey) : false;
if (!deployed) {
  log("Deploy failed or no key, regenerating admin key...");
  const nk = generateAdminKeyLocal();
  if (!nk) {
    console.error("Failed to generate admin key");
    process.exit(1);
  }
  log(`New key ${nk.slice(0, 12)}... patching secret`);
  try {
    const b64 = Buffer.from(nk).toString("base64");
    execSync(
      `kubectl -n uni-dev patch secret thenextcraft-secrets --type merge -p '{"data":{"CONVEX_SELF_HOSTED_ADMIN_KEY":"${b64}"}}'`,
      { stdio: "inherit" },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`kubectl patch failed, continuing: ${msg}`);
  }
  adminKey = nk;
  if (!tryDeploy(adminKey)) {
    console.error("Retry deploy failed");
    process.exit(1);
  }
}
log("✔ Deployed Convex functions");

const envs: Array<[string, string]> = [
  ["AUTH_GOOGLE_ID", process.env.AUTH_GOOGLE_ID ?? ""],
  ["AUTH_GOOGLE_SECRET", process.env.AUTH_GOOGLE_SECRET ?? ""],
  ["SITE_URL", process.env.SITE_URL ?? ""],
  ["JWT_PRIVATE_KEY", process.env.JWT_PRIVATE_KEY ?? ""],
  ["JWKS", process.env.JWKS ?? ""],
];

for (const [k, v] of envs) {
  if (!v) {
    log(`Skipping ${k} (empty)`);
    continue;
  }
  log(`Setting ${k}...`);
  const r = spawnSync("bun", [convexBin, "env", "set", k, "--url", convexUrl, "--admin-key", adminKey], {
    cwd: "packages/backend",
    input: v,
    stdio: "inherit",
  });
  if (r.status !== 0) log(`set ${k} failed (maybe built-in)`);
}

log("=== k8s convex sync complete ===");
