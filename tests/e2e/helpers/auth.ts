import type { Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authStatePath = path.resolve(__dirname, "../.auth-state.json");

export const E2E_USERNAME = "e2e_admin";
export const E2E_PASSWORD = "E2e@Pegasus!99";

function readAuthState(): { token: string; user: unknown } {
  const raw = fs.readFileSync(authStatePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Inject stored token directly into localStorage — no UI login needed.
 * This avoids hitting the auth rate limiter across multiple tests.
 */
export async function login(page: Page) {
  const { token, user } = readAuthState();

  // Navigate to root first so localStorage is accessible
  await page.goto("/");
  await page.evaluate(
    ({ t, u }) => {
      localStorage.setItem("pegasus-manager:token", t);
      localStorage.setItem("pegasus-manager:user", JSON.stringify(u));
    },
    { t: token, u: user },
  );

  await page.goto("/app");
  await page.waitForURL("**/app**", { timeout: 10_000 });
}

/**
 * Clear auth state and redirect to login page.
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("pegasus-manager:token");
    localStorage.removeItem("pegasus-manager:user");
    window.dispatchEvent(new Event("pegasus:auth:logout"));
  });
  await page.waitForURL("**/login**", { timeout: 5000 });
}

/**
 * Clear stored auth state without triggering the logout event.
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("pegasus-manager:token");
    localStorage.removeItem("pegasus-manager:user");
  });
}
