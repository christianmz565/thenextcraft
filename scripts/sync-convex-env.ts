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

let jwtPrivateKey = getEnvVar(envDevContent, "JWT_PRIVATE_KEY");
let jwks = getEnvVar(envDevContent, "JWKS");

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

let adminKey =
  process.env.CONVEX_SELF_HOSTED_ADMIN_KEY ||
  getEnvVar(envDevContent, "CONVEX_SELF_HOSTED_ADMIN_KEY");

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
    console.error("Failed to generate admin key from backend container:", message);
  }
}

if (!adminKey) {
  console.error("Error: Could not obtain CONVEX_SELF_HOSTED_ADMIN_KEY");
  process.exit(1);
}

console.log(`Using Convex Admin Key: ${adminKey}`);

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

const googleClientId =
  getEnvVar(envDevContent, "AUTH_GOOGLE_ID") ||
  getEnvVar(envDevContent, "GOOGLE_CLIENT") ||
  process.env.AUTH_GOOGLE_ID ||
  "";
const googleClientSecret =
  getEnvVar(envDevContent, "AUTH_GOOGLE_SECRET") ||
  getEnvVar(envDevContent, "GOOGLE_SECRET") ||
  process.env.AUTH_GOOGLE_SECRET ||
  "";
const siteUrl =
  getEnvVar(envDevContent, "SITE_URL") || process.env.SITE_URL || "http://localhost:3000";
const convexUrl =
  getEnvVar(envDevContent, "CONVEX_SELF_HOSTED_URL") ||
  process.env.CONVEX_SELF_HOSTED_URL ||
  "http://127.0.0.1:3210";

console.log("Syncing environment variables to self-hosted Convex backend...");

function setConvexEnv(key: string, value: string) {
  if (!value) return;
  try {
    execSync(
      `bun node_modules/.bin/convex env set ${key} --url "${convexUrl}" --admin-key "${adminKey}"`,
      {
        cwd: path.join(rootDir, "packages/backend"),
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
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
