import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "../../backend");
const authStatePath = path.resolve(__dirname, ".auth-state.json");

export default async function globalTeardown() {
  execSync(
    "npx ts-node --project tsconfig.json prisma/teardown-e2e-user.ts",
    { cwd: backendDir, stdio: "inherit" },
  );
  if (fs.existsSync(authStatePath)) fs.unlinkSync(authStatePath);
}
