import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { validateIntegrationDatabaseUrl } from "./integrationDatabaseGuard.mjs";

let activeChild = null;
let interruptedSignal = null;

export function parseLoopbackPort(output) {
  const match = /^127\.0\.0\.1:(\d+)$/.exec(output.trim());
  const port = Number(match?.[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Docker n’a pas publié PostgreSQL sur une adresse loopback locale.");
  }
  return port;
}

export function buildDisposablePostgresArgs(containerName, password) {
  return [
    "run", "--detach", "--name", containerName,
    "--label", "kookia.scope=disposable-local-delivery",
    "--publish", "127.0.0.1::5432/tcp",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=2g",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=512m",
    "--env", "POSTGRES_DB=kookia_test",
    "--env", "POSTGRES_USER=kookia",
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--health-cmd", "pg_isready -U kookia -d kookia_test",
    "--health-interval", "1s", "--health-timeout", "2s", "--health-retries", "60",
    "postgres:16-alpine",
  ];
}

export function integrationDatabaseUrl(port, password, database = "kookia_test") {
  if (!["kookia_test", "kookia_restore"].includes(database)) throw new Error("Base locale inattendue.");
  return `postgresql://kookia:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;
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

async function waitForPostgres(containerName) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (interruptedSignal) throw new Error("Recette locale interrompue.");
    const result = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", "kookia", "-d", "kookia_test"], { stdio: "ignore" });
    if (result.error) throw new Error(`Impossible de vérifier PostgreSQL : ${result.error.message}`);
    if (result.status === 0) return;
    await delay(500);
  }
  throw new Error("PostgreSQL local temporaire n’est pas devenu prêt en 60 secondes.");
}

function cleanupContainer(containerName) {
  const removed = spawnSync("docker", ["rm", "--force", containerName], { stdio: "ignore" });
  if (!removed.error && removed.status === 0) return;
  const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  if (!inspected.error && inspected.status !== 0 && !/permission denied|cannot connect|error during connect/i.test(inspected.stderr ?? "")) return;
  console.error(`Nettoyage Docker non confirmé. Vérifiez puis supprimez le conteneur temporaire ${containerName} s’il existe.`);
  process.exitCode = 1;
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
    await waitForPostgres(containerName);

    const databaseUrl = integrationDatabaseUrl(port, password);
    validateIntegrationDatabaseUrl(databaseUrl);
    const testEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "test" };
    for (const script of ["lint", "build", "build:api"]) {
      console.log(`\n==> npm run ${script}`);
      await run("npm", ["run", script]);
    }
    console.log("\n==> Migrations fraîches");
    await run("npm", ["run", "db:migrate"], { env: testEnv });
    console.log("\n==> npm test");
    await run("npm", ["test"], { env: testEnv });
    console.log("\n==> npm run test:integration");
    await run("npm", ["run", "test:integration"], { env: testEnv });

    console.log("\n==> Vérification de sauvegarde/restauration synthétique");
    await dockerExec(containerName, password, ["createdb", "--host", "127.0.0.1", "--username", "kookia", "kookia_restore"]);
    await dockerExec(containerName, password, ["psql", "--set", "ON_ERROR_STOP=1", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_test",
      "--command", "CREATE TABLE r0_backup_probe (id text PRIMARY KEY, note text NOT NULL); INSERT INTO r0_backup_probe VALUES ('source', 'synthetic-only');"]);
    await dockerExec(containerName, password, ["pg_dump", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_test", "--format", "custom", "--file", "/tmp/kookia-r0.dump"]);
    await dockerExec(containerName, password, ["pg_restore", "--exit-on-error", "--no-owner", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_restore", "/tmp/kookia-r0.dump"]);
    const restoredProbe = await dockerExec(containerName, password, ["psql", "--tuples-only", "--no-align", "--host", "127.0.0.1", "--username", "kookia", "--dbname", "kookia_restore",
      "--command", "SELECT note FROM r0_backup_probe WHERE id = 'source';"], { capture: true });
    if (restoredProbe !== "synthetic-only") throw new Error("La donnée témoin synthétique n’a pas survécu à la restauration.");
    await run("npm", ["exec", "--", "prisma", "migrate", "status"], { env: { ...testEnv, DATABASE_URL: integrationDatabaseUrl(port, password, "kookia_restore") } });
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
