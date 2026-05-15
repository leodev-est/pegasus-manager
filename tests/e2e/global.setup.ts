import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "../../backend");
const authStatePath = path.resolve(__dirname, ".auth-state.json");

export const E2E_USERNAME = "e2e_admin";
export const E2E_PASSWORD = "E2e@Pegasus!99";
const API_URL = "http://localhost:3000";

export default async function globalSetup() {
  // 1. Create test user
  execSync(
    "npx ts-node --project tsconfig.json prisma/seed-e2e-user.ts",
    { cwd: backendDir, stdio: "inherit" },
  );

  // 2. Login once via API and persist token so tests don't hit the rate limiter
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: E2E_USERNAME, password: E2E_PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[E2E] Login failed during setup: ${res.status} ${body}`);
  }

  const { token, user } = (await res.json()) as { token: string; user: unknown };

  // Save auth state for tests to inject directly into localStorage
  fs.writeFileSync(authStatePath, JSON.stringify({ token, user }, null, 2));
  console.log(`[E2E] Auth state saved to ${path.basename(authStatePath)}`);
}
