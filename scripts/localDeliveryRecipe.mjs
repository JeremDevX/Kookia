import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateIntegrationDatabaseUrl } from "./integrationDatabaseGuard.mjs";
import { buildDisposablePostgresArgs, cleanupContainer, disposableDatabaseUrl, parseLoopbackPort, waitForPostgres } from "./disposablePostgres.mjs";

let activeChild = null;
let interruptedSignal = null;

export function integrationTestNpmArgs(extraArgs = []) {
  return ["run", "test:integration", ...(extraArgs.length ? ["--", ...extraArgs] : [])];
}

function run(command, args, { env = process.env, capture = false } = {}) {
  if (interruptedSignal) return Promise.reject(new Error("Recette locale interrompue."));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    activeChild = child;
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
      child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    }
    child.once("error", (error) => {
      if (activeChild === child) activeChild = null;
      reject(new Error(`Impossible de lancer ${command} : ${error.message}`));
    });
    child.once("close", (status, signal) => {
      if (activeChild === child) activeChild = null;
      if (interruptedSignal) reject(new Error("Recette locale interrompue."));
      else if (status !== 0) reject(new Error(`${command} a échoué (${status ?? signal ?? "arrêt"}).${stderr.trim() ? ` ${stderr.trim()}` : ""}`));
      else resolve(capture ? stdout.trim() : "");
    });
  });
}

function dockerExec(containerName, password, args, options = {}) {
  return run("docker", ["exec", "--env", `PGPASSWORD=${password}`, containerName, ...args], options);
}

async function main() {
  const containerName = `kookia-r0-${randomUUID().slice(0, 12)}`;
  const password = randomBytes(24).toString("hex");
  let mayExist = false;
  const handleSignal = (signal) => {
    interruptedSignal = signal;
    process.exitCode = signal === "SIGINT" ? 130 : 143;
    activeChild?.kill(signal);
  };
  process.once("SIGINT", () => handleSignal("SIGINT"));
  process.once("SIGTERM", () => handleSignal("SIGTERM"));
  try {
    console.log("Démarrage de PostgreSQL 16 jetable (loopback + tmpfs, aucun volume)…");
    mayExist = true;
    await run("docker", buildDisposablePostgresArgs(containerName, password));
    const port = parseLoopbackPort(await run("docker", ["port", containerName, "5432/tcp"], { capture: true }));
    await waitForPostgres(containerName, "kookia_test", () => interruptedSignal !== null);

    const databaseUrl = disposableDatabaseUrl(port, password, "kookia_test");
    validateIntegrationDatabaseUrl(databaseUrl);
    const testEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" };
    for (const script of ["check:quality", "build", "build:api", "documents:build"]) {
      console.log(`\n==> npm run ${script}`);
      await run("npm", ["run", script]);
    }
    console.log("\n==> Migrations fraîches");
    await run("npm", ["run", "db:migrate"], { env: testEnv });
    console.log("\n==> Parité schéma Prisma/migrations");
    await run("npm", ["exec", "--", "prisma", "migrate", "diff",
      "--from-url", databaseUrl,
      "--to-schema-datamodel", "prisma/schema.prisma",
      "--exit-code"], { env: testEnv });
    console.log("\n==> npm test");
    await run("npm", ["test"], { env: testEnv });
    console.log("\n==> npm run test:integration");
    await run("npm", integrationTestNpmArgs(process.argv.slice(2)), { env: testEnv });

    console.log("\n==> Vérification de sauvegarde/restauration synthétique");
    await dockerExec(containerName, password, ["createdb", "--host", "127.0.0.1", "--username", "kookia", "kookia_restore"]);
    await dockerExec(containerName, password, ["psql", "--set", "ON_ERROR_STOP=1", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_test",
      "--command", "CREATE TABLE r0_backup_probe (id text PRIMARY KEY, note text NOT NULL); INSERT INTO r0_backup_probe VALUES ('source', 'synthetic-only');"]);
    await dockerExec(containerName, password, ["pg_dump", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_test", "--format", "custom", "--file", "/tmp/kookia-r0.dump"]);
    await dockerExec(containerName, password, ["pg_restore", "--exit-on-error", "--no-owner", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_restore", "/tmp/kookia-r0.dump"]);
    const restoredProbe = await dockerExec(containerName, password, ["psql", "--tuples-only", "--no-align", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_restore",
      "--command", "SELECT note FROM r0_backup_probe WHERE id = 'source';"], { capture: true });
    if (restoredProbe !== "synthetic-only") throw new Error("La donnée témoin synthétique n’a pas survécu à la restauration.");
    await run("npm", ["exec", "--", "prisma", "migrate", "status"], { env: { ...testEnv, DATABASE_URL: disposableDatabaseUrl(port, password, "kookia_restore") } });
    console.log("Sauvegarde restaurée, donnée synthétique vérifiée et migrations présentes.");
    console.log("\nRecette locale terminée ; le conteneur et ses données temporaires vont être supprimés.");
  } catch (error) {
    console.error(interruptedSignal ? "Recette locale interrompue." : error instanceof Error ? error.message : "La recette locale a échoué.");
    process.exitCode = interruptedSignal === "SIGINT" ? 130 : interruptedSignal === "SIGTERM" ? 143 : 1;
  } finally {
    if (mayExist) cleanupContainer(containerName);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
