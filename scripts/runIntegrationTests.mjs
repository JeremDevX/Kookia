import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { validateIntegrationDatabaseUrl } from "./integrationDatabaseGuard.mjs";

try {
  validateIntegrationDatabaseUrl(process.env.DATABASE_URL);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unsafe integration database URL.");
  process.exit(1);
}

const vitestCli = resolve("node_modules/vitest/vitest.mjs");
const result = spawnSync(
  process.execPath,
  [vitestCli, "run", "--config", "vitest.integration.config.ts"],
  { stdio: "inherit", env: process.env }
);

if (result.error) {
  console.error("Could not start the integration test runner.");
  process.exit(1);
}

process.exit(result.status ?? 1);
