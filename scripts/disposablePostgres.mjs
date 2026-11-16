import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

export function parseLoopbackPort(output) {
  const match = /^127\.0\.0\.1:(\d+)$/.exec(output.trim());
  const port = Number(match?.[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Docker n’a pas publié PostgreSQL sur une adresse loopback locale.");
  }
  return port;
}

export function buildDisposablePostgresArgs(containerName, password, { database = "kookia_test", scope = "disposable-local-delivery" } = {}) {
  if (!["kookia_test", "kookia_demo"].includes(database) || !/^[a-z-]+$/.test(scope)) {
    throw new Error("Configuration de base temporaire inattendue.");
  }
  return [
    "run", "--detach", "--name", containerName,
    "--label", `kookia.scope=${scope}`,
    "--publish", "127.0.0.1::5432/tcp",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=2g",
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=512m",
    "--env", `POSTGRES_DB=${database}`,
    "--env", "POSTGRES_USER=kookia",
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--health-cmd", `pg_isready -U kookia -d ${database}`,
    "--health-interval", "1s", "--health-timeout", "2s", "--health-retries", "60",
    "postgres:16-alpine",
  ];
}

export function disposableDatabaseUrl(port, password, database) {
  if (!["kookia_test", "kookia_demo", "kookia_restore"].includes(database)) throw new Error("Base locale inattendue.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port PostgreSQL temporaire invalide.");
  return `postgresql://kookia:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`;
}

export async function waitForPostgres(containerName, database, isInterrupted) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (isInterrupted()) throw new Error("Démarrage de PostgreSQL interrompu.");
    const result = spawnSync("docker", ["exec", containerName, "pg_isready", "-U", "kookia", "-d", database], { stdio: "ignore" });
    if (result.error) throw new Error(`Impossible de vérifier PostgreSQL : ${result.error.message}`);
    if (result.status === 0) return;
    await delay(500);
  }
  throw new Error("PostgreSQL local temporaire n’est pas devenu prêt en 60 secondes.");
}

export function cleanupContainer(containerName) {
  const removed = spawnSync("docker", ["rm", "--force", containerName], { stdio: "ignore" });
  if (!removed.error && removed.status === 0) return;
  const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  if (!inspected.error && inspected.status === 1 && /no such (?:object|container)\b/i.test(inspected.stderr ?? "")) return;
  console.error(`Nettoyage Docker non confirmé. Vérifiez puis supprimez le conteneur temporaire ${containerName} s’il existe.`);
  process.exitCode = 1;
}
