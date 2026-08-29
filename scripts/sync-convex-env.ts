import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(__dirname, "..");
const envDevPath = path.join(rootDir, ".env.dev");
let envDevContent = fs.existsSync(envDevPath) ? fs.readFileSync(envDevPath, "utf8") : "";

function getEnvVar(content: string, name: string): string | null {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${name}=`)) {
      let val = trimmed.slice(name.length + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      return val;
    }
  }
  return null;
}

function resolveEnv(name: string, fallback = ""): string {
  if (process.env[name] && process.env[name]?.trim() !== "") {
    return process.env[name]?.trim();
  }
  const fromDev = getEnvVar(envDevContent, name);
  if (fromDev && fromDev.trim() !== "") {
    return fromDev.trim();
  }
  return fallback;
}

const convexUrl =
  process.env.CONVEX_SELF_HOSTED_URL ||
  process.env.CONVEX_URL ||
  getEnvVar(envDevContent, "CONVEX_SELF_HOSTED_URL") ||
  getEnvVar(envDevContent, "CONVEX_URL") ||
  "http://127.0.0.1:3210";

console.log(`Targeting Convex Backend URL: ${convexUrl}`);

let jwtPrivateKey = resolveEnv("JWT_PRIVATE_KEY");
let jwks = resolveEnv("JWKS");

if (!jwtPrivateKey || !jwks) {
  console.log("Generating RS256 key pair for Convex Auth (JWT_PRIVATE_KEY & JWKS)...");
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "jwk" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  jwtPrivateKey = privateKey.trimEnd().replace(/\n/g, " ");
  jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

  let appendText = "";
  if (!getEnvVar(envDevContent, "JWT_PRIVATE_KEY")) {
    appendText += `\nJWT_PRIVATE_KEY="${jwtPrivateKey}"`;
  }
  if (!getEnvVar(envDevContent, "JWKS")) {
    appendText += `\nJWKS='${jwks}'`;
  }

  if (fs.existsSync(envDevPath) && appendText) {
    fs.appendFileSync(envDevPath, `${appendText}\n`);
    envDevContent = fs.readFileSync(envDevPath, "utf8");
    console.log("Saved JWT keys to .env.dev");
  }
}

let adminKey = resolveEnv("CONVEX_SELF_HOSTED_ADMIN_KEY");

if (!adminKey) {
  try {
    adminKey = execSync(
      "docker compose --env-file .env.dev -f docker-compose.dev.yml exec -T backend ./generate_admin_key.sh",
      { cwd: rootDir },
    )
      .toString()
      .trim();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log("Docker compose admin key generation not available:", message);
  }
}

if (!adminKey) {
  console.error(
    "Error: Could not obtain CONVEX_SELF_HOSTED_ADMIN_KEY from process.env, .env.dev, or Docker",
  );
  process.exit(1);
}

console.log(`Using Convex Admin Key: ${adminKey.slice(0, 8)}...`);

const webEnvLocalPath = path.join(rootDir, "apps/web/.env.local");
if (fs.existsSync(webEnvLocalPath)) {
  let webEnvContent = fs.readFileSync(webEnvLocalPath, "utf8");
  if (webEnvContent.includes("CONVEX_SELF_HOSTED_ADMIN_KEY=")) {
    webEnvContent = webEnvContent.replace(
      /^CONVEX_SELF_HOSTED_ADMIN_KEY=.*/m,
      `CONVEX_SELF_HOSTED_ADMIN_KEY="${adminKey}"`,
    );
  } else {
    webEnvContent += `\nCONVEX_SELF_HOSTED_ADMIN_KEY="${adminKey}"\n`;
  }
  fs.writeFileSync(webEnvLocalPath, webEnvContent);
}

const googleClientId = resolveEnv("AUTH_GOOGLE_ID") || resolveEnv("GOOGLE_CLIENT");
const googleClientSecret = resolveEnv("AUTH_GOOGLE_SECRET") || resolveEnv("GOOGLE_SECRET");
const siteUrl = resolveEnv("SITE_URL", "http://localhost:3000");

async function waitForBackend(url: string, retries = 30, delayMs = 2000): Promise<boolean> {
  const versionUrl = `${url.replace(/\/$/, "")}/version`;
  console.log(`Checking backend readiness at ${versionUrl}...`);
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(versionUrl);
      if (res.ok) {
        console.log(`Backend is ready (HTTP ${res.status}).`);
        return true;
      }
    } catch {
      // ignore connection errors during startup
    }
    console.log(`Backend not ready yet (attempt ${i}/${retries}). Waiting ${delayMs / 1000}s...`);
    if (typeof Bun !== "undefined" && typeof Bun.sleep === "function") {
      await Bun.sleep(delayMs);
    } else {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, delayMs);
      await promise;
    }
  }
  return false;
}

const backendReady = await waitForBackend(convexUrl);
if (!backendReady) {
  console.error(`Error: Backend at ${convexUrl} did not become ready in time.`);
  process.exit(1);
}

const backendDir = path.join(rootDir, "packages/backend");
let convexBin = path.join(backendDir, "node_modules/.bin/convex");
if (!fs.existsSync(convexBin)) {
  const rootBin = path.join(rootDir, "node_modules/.bin/convex");
  convexBin = fs.existsSync(rootBin) ? rootBin : "convex";
}

console.log("Deploying Convex functions to backend...");
try {
  execSync(`bun "${convexBin}" deploy --url "${convexUrl}" --admin-key "${adminKey}"`, {
    cwd: backendDir,
    env: {
      ...process.env,
      CONVEX_SELF_HOSTED_URL: convexUrl,
      CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
    },
    stdio: "inherit",
  });
  console.log("Convex functions successfully deployed!");
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("Failed to deploy Convex functions:", message);
  process.exit(1);
}

console.log("Syncing environment variables to self-hosted Convex backend...");

function setConvexEnv(key: string, value: string) {
  if (!value) return;
  try {
    execSync(`bun "${convexBin}" env set ${key} --url "${convexUrl}" --admin-key "${adminKey}"`, {
      cwd: backendDir,
      input: value,
      env: {
        ...process.env,
        CONVEX_SELF_HOSTED_URL: convexUrl,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
      },
      stdio: ["pipe", "inherit", "inherit"],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to set ${key}:`, message);
  }
}

setConvexEnv("AUTH_GOOGLE_ID", googleClientId);
setConvexEnv("AUTH_GOOGLE_SECRET", googleClientSecret);
setConvexEnv("SITE_URL", siteUrl);
setConvexEnv("JWT_PRIVATE_KEY", jwtPrivateKey);
setConvexEnv("JWKS", jwks);

console.log("Convex Auth environment variables successfully synced!");
