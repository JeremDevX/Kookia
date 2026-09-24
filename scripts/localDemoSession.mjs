import { spawn, spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildDisposablePostgresArgs, localDemoDatabaseUrl, parseLoopbackPort } from "./localDeliveryRecipe.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = new Set();
let interruptedSignal = null;
let resolveStop;
const stopRequested = new Promise((resolve) => { resolveStop = resolve; });
const seedWorkspaceSource = `
import { prisma } from "./server/src/infrastructure/database/prisma.ts";
import { seedLocalDemoScenario } from "./server/src/scripts/localDemoScenario.ts";

const ownerId = process.env.LOCAL_DEMO_USER_ID;
if (!ownerId) throw new Error("Compte de démonstration manquant.");
try {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length !== 1 || users[0].id !== ownerId) {
    throw new Error("Le bac démo doit contenir uniquement le compte local créé pour cette session.");
  }
  const { plan } = await seedLocalDemoScenario(ownerId);
  console.info(JSON.stringify({ mode: "demo", counts: plan.counts, yearCoverage: plan.yearCoverage }, null, 2));
} finally {
  await prisma.$disconnect();
}
`.trim();

function spawnTask(command, args, { env = process.env, capture = false } = {}) {
  if (interruptedSignal) return Promise.reject(new Error("Démo locale interrompue."));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit" });
    children.add(child);
    let stdout = "";
    if (capture) child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.once("error", (error) => {
      children.delete(child);
      reject(new Error(`Impossible de lancer ${command} : ${error.message}`));
    });
    child.once("close", (status, signal) => {
      children.delete(child);
      if (interruptedSignal) reject(new Error("Démo locale interrompue."));
      else if (status !== 0) reject(new Error(`${command} a échoué (${status ?? signal ?? "arrêt"}).`));
      else resolve(capture ? stdout.trim() : "");
    });
  });
}

function startServer(command, args, env) {
  const child = spawn(command, args, { cwd: projectRoot, env, stdio: "inherit" });
  children.add(child);
  child.once("close", () => children.delete(child));
  child.once("error", (error) => { console.error(`Arrêt du serveur local : ${error.message}`); });
  return child;
}

async function findLoopbackPort(excluded = new Set()) {
  while (true) {
    const probe = net.createServer();
    const port = await new Promise((resolve, reject) => {
      probe.once("error", reject);
      probe.listen(0, "127.0.0.1", () => {
        const address = probe.address();
        if (!address || typeof address === "string") reject(new Error("Impossible de réserver un port local."));
        else resolve(address.port);
      });
    });
    await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
    if (!excluded.has(port)) return port;
  }
}

async function waitForPostgres(containerName) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (interruptedSignal) throw new Error("Démo locale interrompue.");
    const result = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", "kookia", "-d", "kookia_demo"], { stdio: "ignore" });
    if (result.error) throw new Error(`Impossible de vérifier PostgreSQL : ${result.error.message}`);
    if (result.status === 0) return;
    await delay(500);
  }
  throw new Error("PostgreSQL local temporaire n’est pas devenu prêt en 60 secondes.");
}

function startDisposablePostgres(containerName, password) {
  return spawnTask("docker", buildDisposablePostgresArgs(containerName, password, {
    database: "kookia_demo", scope: "disposable-local-demo",
  }), { capture: true });
}

async function waitForHttp(url, serverProcesses) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (interruptedSignal) throw new Error("Démo locale interrompue.");
    if (serverProcesses.some((child) => child.exitCode !== null)) throw new Error("Un serveur local s’est arrêté au démarrage.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch { /* Le serveur démarre encore. */ }
    await delay(250);
  }
  throw new Error(`Le service local n’a pas répondu sur ${url}.`);
}

async function registerDemoAccount(password, webOrigin) {
  const response = await fetch(`${webOrigin}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json", origin: webOrigin },
    body: JSON.stringify({ displayName: "Démo locale", email: "demo@kookia.local", password }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Création du compte de démonstration impossible (${response.status}).`);
  const result = await response.json();
  if (typeof result.user?.id !== "string") throw new Error("Le serveur n’a pas créé le compte de démonstration attendu.");
  return result.user.id;
}

function cleanupContainer(containerName) {
  const removed = spawnSync("docker", ["rm", "--force", containerName], { stdio: "ignore" });
  if (!removed.error && removed.status === 0) return;
  const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  if (!inspected.error && inspected.status !== 0 && !/permission denied|cannot connect|error during connect/i.test(inspected.stderr ?? "")) return;
  console.error(`Nettoyage Docker non confirmé. Vérifiez puis supprimez le conteneur temporaire ${containerName} s’il existe.`);
  process.exitCode = 1;
}

function requestStop(signal) {
  if (interruptedSignal) return;
  interruptedSignal = signal;
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  resolveStop(signal);
  for (const child of children) child.kill("SIGTERM");
}

async function stopServers() {
  for (const child of children) child.kill("SIGTERM");
  await Promise.race([Promise.all([...children].map((child) => new Promise((resolve) => child.once("close", resolve)))), delay(3_000)]);
  for (const child of children) child.kill("SIGKILL");
}

async function main() {
  if (process.argv.length > 2) throw new Error("La démo locale ne prend aucun argument.");
  const containerName = `kookia-demo-${randomUUID().slice(0, 12)}`;
  const dbPassword = randomBytes(24).toString("hex");
  const demoPassword = randomBytes(24).toString("base64url");
  let mayExist = false;
  let credentialDirectory;
  let apiPort;
  let webPort;
  process.on("SIGINT", () => requestStop("SIGINT"));
  process.on("SIGTERM", () => requestStop("SIGTERM"));
  try {
    apiPort = await findLoopbackPort();
    webPort = await findLoopbackPort(new Set([apiPort]));
    console.log("Démarrage d’un PostgreSQL démo neuf (loopback + tmpfs, sans volume)…");
    mayExist = true;
    await startDisposablePostgres(containerName, dbPassword);
    const port = parseLoopbackPort(await spawnTask("docker", ["port", containerName, "5432/tcp"], { capture: true }));
    const databaseUrl = localDemoDatabaseUrl(port, dbPassword);
    await waitForPostgres(containerName);

    const demoEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "development" };
    console.log("\n==> Migrations fraîches");
    await spawnTask("npm", ["run", "db:migrate"], { env: demoEnv, capture: true });
    console.log("Migrations terminées.");

    const webOrigin = `http://127.0.0.1:${webPort}`;
    const apiEnv = { ...demoEnv, HOST: "127.0.0.1", PORT: String(apiPort), APP_ORIGIN: webOrigin };
    const api = startServer(process.execPath, ["--import", "tsx", "server/src/index.ts"], apiEnv);
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`, [api]);
    const webEnv = { ...demoEnv, KOOKIA_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` };
    delete webEnv.DATABASE_URL;
    const web = startServer(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], webEnv);
    await waitForHttp(`${webOrigin}/login`, [api, web]);
    const ownerId = await registerDemoAccount(demoPassword, webOrigin);
    await spawnTask(process.execPath, ["--import", "tsx", "server/src/scripts/seedWorkspaces.ts"], { env: demoEnv });
    await spawnTask(process.execPath, ["--import", "tsx", "--input-type=module", "-e", seedWorkspaceSource], {
      env: { ...demoEnv, LOCAL_DEMO_USER_ID: ownerId },
    });

    credentialDirectory = await mkdtemp(path.join(tmpdir(), "kookia-local-demo-"));
    await chmod(credentialDirectory, 0o700);
    const credentialPath = path.join(credentialDirectory, "identifiants.txt");
    await writeFile(credentialPath, `Email : demo@kookia.local\nMot de passe : ${demoPassword}\n`, { mode: 0o600, flag: "wx" });
    await chmod(credentialPath, 0o600);

    console.log(`\nDémo locale prête : ${webOrigin}/login`);
    console.log("Compte : demo@kookia.local");
    console.log(`Mot de passe dans le fichier privé temporaire : ${credentialPath}`);
    console.log("Ctrl-C arrête les serveurs et supprime le compte, la base tmpfs et le fichier d’identifiants.");
    await Promise.race([
      stopRequested,
      new Promise((_, reject) => api.once("exit", (code, signal) => {
        if (!interruptedSignal) reject(new Error(`Le serveur API s’est arrêté (${code ?? signal ?? "inconnu"}).`));
      })),
      new Promise((_, reject) => web.once("exit", (code, signal) => {
        if (!interruptedSignal) reject(new Error(`Le serveur web s’est arrêté (${code ?? signal ?? "inconnu"}).`));
      })),
    ]);
  } catch (error) {
    console.error(interruptedSignal ? "Démo locale interrompue." : error instanceof Error ? error.message : "La démo locale a échoué.");
    process.exitCode = interruptedSignal === "SIGINT" ? 130 : interruptedSignal === "SIGTERM" ? 143 : 1;
  } finally {
    await stopServers();
    if (mayExist) cleanupContainer(containerName);
    if (credentialDirectory) await rm(credentialDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
