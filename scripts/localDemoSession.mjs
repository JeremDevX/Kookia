import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildDisposablePostgresArgs, cleanupContainer, disposableDatabaseUrl, parseLoopbackPort, waitForPostgres } from "./disposablePostgres.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const children = new Set();
const session = new AbortController();
let interruptedSignal = null;

async function spawnTask(command, args, { env = process.env, capture = false } = {}) {
  session.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, env, signal: session.signal,
      stdio: capture ? ["ignore", "pipe", "ignore"] : "inherit" });
    children.add(child);
    let stdout = "";
    if (capture) child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.once("error", (error) => {
      reject(session.signal.reason ?? new Error(`Impossible de lancer ${command} : ${error.message}`));
    });
    child.once("close", (status, signal) => {
      children.delete(child);
      if (session.signal.aborted) reject(session.signal.reason);
      else if (status !== 0) reject(new Error(`${command} a échoué (${status ?? signal ?? "arrêt"}).`));
      else resolve(capture ? stdout.trim() : "");
    });
  });
}

function startServer(name, args, env) {
  session.signal.throwIfAborted();
  const child = spawn(process.execPath, args, { cwd: projectRoot, env, stdio: "inherit" });
  children.add(child);
  child.once("close", () => children.delete(child));
  child.once("exit", (code, signal) => {
    session.abort(new Error(`Le serveur ${name} s’est arrêté (${code ?? signal ?? "inconnu"}).`));
  });
  child.once("error", (error) => session.abort(new Error(`Impossible de lancer le serveur ${name} : ${error.message}`)));
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

function startDisposablePostgres(containerName, password) {
  return spawnTask("docker", buildDisposablePostgresArgs(containerName, password, {
    database: "kookia_demo", scope: "disposable-local-demo",
  }), { capture: true });
}

async function waitForHttp(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.any([session.signal, AbortSignal.timeout(1_000)]) });
      if (response.ok) return;
    } catch { /* Le serveur démarre encore. */ }
    await delay(250, undefined, { signal: session.signal });
  }
  throw new Error(`Le service local n’a pas répondu sur ${url}.`);
}

async function registerDemoAccount(password, webOrigin) {
  const response = await fetch(`${webOrigin}/api/auth/register`, {
    method: "POST", headers: { "content-type": "application/json", origin: webOrigin },
    body: JSON.stringify({ displayName: "Démo locale", email: "demo@kookia.local", password }),
    signal: AbortSignal.any([session.signal, AbortSignal.timeout(10_000)]),
  });
  if (!response.ok) throw new Error(`Création du compte de démonstration impossible (${response.status}).`);
  const result = await response.json();
  if (typeof result.user?.id !== "string") throw new Error("Le serveur n’a pas créé le compte de démonstration attendu.");
  return result.user.id;
}

function requestStop(signal) {
  if (session.signal.aborted) return;
  interruptedSignal = signal;
  process.exitCode = signal === "SIGINT" ? 130 : 143;
  session.abort(new Error("Démo locale interrompue."));
}

async function stopServers() {
  const closed = Promise.all([...children].map((child) => new Promise((resolve) => child.once("close", resolve))));
  for (const child of children) child.kill("SIGTERM");
  await Promise.race([closed, delay(3_000, undefined, { ref: false })]);
  for (const child of children) child.kill("SIGKILL");
}

async function main() {
  const fixtureOnly = process.argv[2] === "--fixtures";
  if (process.argv.length > (fixtureOnly ? 3 : 2) || (process.argv.length > 2 && !fixtureOnly)) {
    throw new Error("Usage : node scripts/localDemoSession.mjs [--fixtures].");
  }
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
    const databaseUrl = disposableDatabaseUrl(port, dbPassword, "kookia_demo");
    await waitForPostgres(containerName, "kookia_demo", () => session.signal.aborted);

    const demoEnv = { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "development" };
    console.log("\n==> Migrations fraîches");
    await spawnTask("npm", ["run", "db:migrate"], { env: demoEnv, capture: true });
    console.log("Migrations terminées.");

    const webOrigin = `http://127.0.0.1:${webPort}`;
    const apiEnv = { ...demoEnv, HOST: "127.0.0.1", PORT: String(apiPort), APP_ORIGIN: webOrigin,
      LOCAL_DEMO_INVOICE_FIXTURE: "true" };
    startServer("API", ["--import", "tsx", "server/src/index.ts"], apiEnv);
    await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`);
    const webEnv = { ...demoEnv, KOOKIA_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` };
    delete webEnv.DATABASE_URL;
    startServer("web", ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], webEnv);
    await waitForHttp(`${webOrigin}/login`);
    const ownerId = await registerDemoAccount(demoPassword, webOrigin);
    const seedEnv = { ...demoEnv, LOCAL_DEMO_USER_ID: ownerId };
    await spawnTask(process.execPath, ["--import", "tsx", "server/src/scripts/seedWorkspaces.ts"], { env: seedEnv });
    await spawnTask(process.execPath, ["--import", "tsx", "server/src/scripts/seedLocalDemoScenario.ts",
      ...(fixtureOnly ? ["--fixtures"] : [])], { env: seedEnv });

    credentialDirectory = await mkdtemp(path.join(tmpdir(), "kookia-local-demo-"));
    await chmod(credentialDirectory, 0o700);
    const credentialPath = path.join(credentialDirectory, "identifiants.txt");
    await writeFile(credentialPath, `Email : demo@kookia.local\nMot de passe : ${demoPassword}\n`, { mode: 0o600, flag: "wx" });
    await chmod(credentialPath, 0o600);

    session.signal.throwIfAborted();
    console.log(`\nDémo ${fixtureOnly ? "à fixtures synthétiques" : "locale"} prête : ${webOrigin}/login`);
    console.log("Compte : demo@kookia.local");
    console.log(`Mot de passe dans le fichier privé temporaire : ${credentialPath}`);
    console.log("Ctrl-C arrête les serveurs et supprime le compte, la base tmpfs et le fichier d’identifiants.");
    await once(session.signal, "abort");
    if (!interruptedSignal) session.signal.throwIfAborted();
  } catch (error) {
    const cause = session.signal.reason ?? error;
    console.error(cause instanceof Error ? cause.message : "La démo locale a échoué.");
    process.exitCode = interruptedSignal === "SIGINT" ? 130 : interruptedSignal === "SIGTERM" ? 143 : 1;
  } finally {
    await stopServers();
    if (mayExist) cleanupContainer(containerName);
    if (credentialDirectory) await rm(credentialDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
