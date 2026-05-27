// Retry wrapper for prisma migrate deploy — handles advisory lock timeout (P1002)
// on cloud environments where old/new instances overlap during deploys.
const { spawnSync } = require("child_process");

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 4000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[migrate] Tentativa ${attempt}/${MAX_RETRIES}...`);
    const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      shell: true,
    });
    if (result.status === 0) {
      console.log("[migrate] Sucesso.");
      return;
    }
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * attempt;
      console.log(`[migrate] Falhou, aguardando ${delay}ms antes de tentar novamente...`);
      await sleep(delay);
    }
  }
  console.error("[migrate] Todas as tentativas falharam.");
  process.exit(1);
}

run();
