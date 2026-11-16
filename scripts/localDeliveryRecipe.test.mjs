import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import test from "node:test";
import { buildDisposablePostgresArgs, cleanupContainer, disposableDatabaseUrl, parseLoopbackPort, waitForPostgres } from "./disposablePostgres.mjs";
import { integrationTestNpmArgs } from "./localDeliveryRecipe.mjs";

function mockDocker(t, run) {
  const docker = t.mock.method(childProcess, "spawnSync", (command, args) => {
    assert.equal(command, "docker");
    return run(args);
  });
  syncBuiltinESMExports();
  t.after(() => {
    docker.mock.restore();
    syncBuiltinESMExports();
  });
  return docker.mock;
}

test("publishes only a loopback port and uses volatile database and dump storage", () => {
  const args = buildDisposablePostgresArgs("kookia-r0-test", "temporary-password");
  assert.equal(parseLoopbackPort("127.0.0.1:55432\n"), 55432);
  assert.throws(() => parseLoopbackPort("0.0.0.0:55432"));
  assert.ok(args.includes("127.0.0.1::5432/tcp"));
  assert.ok(args.includes("/var/lib/postgresql/data:rw,noexec,nosuid,size=2g"));
  assert.ok(args.includes("/tmp:rw,noexec,nosuid,size=512m"));
  assert.equal(args.includes("--volume"), false);
});

test("creates only the three temporary database URLs on a valid loopback port", () => {
  assert.equal(disposableDatabaseUrl(55432, "temporary-password", "kookia_test"),
    "postgresql://kookia:temporary-password@127.0.0.1:55432/kookia_test");
  assert.equal(disposableDatabaseUrl(55432, "reserved@:/", "kookia_restore"),
    "postgresql://kookia:reserved%40%3A%2F@127.0.0.1:55432/kookia_restore");
  assert.throws(() => disposableDatabaseUrl(55432, "temporary-password", "kookia"));
  assert.throws(() => disposableDatabaseUrl(65536, "temporary-password", "kookia_demo"));
});

test("forwards focused integration filters through the disposable delivery recipe", () => {
  assert.deepEqual(integrationTestNpmArgs([]), ["run", "test:integration"]);
  assert.deepEqual(integrationTestNpmArgs(["--testNamePattern=service calendar", "--disableConsoleIntercept"]),
    ["run", "test:integration", "--", "--testNamePattern=service calendar", "--disableConsoleIntercept"]);
});

test("isolates the interactive demo in its own tmpfs-only database", () => {
  const args = buildDisposablePostgresArgs("kookia-demo-test", "temporary-password", {
    database: "kookia_demo", scope: "disposable-local-demo",
  });
  assert.ok(args.includes("kookia.scope=disposable-local-demo"));
  assert.ok(args.includes("POSTGRES_DB=kookia_demo"));
  assert.ok(args.includes("pg_isready -U kookia -d kookia_demo"));
  assert.equal(disposableDatabaseUrl(55432, "temporary-password", "kookia_demo"),
    "postgresql://kookia:temporary-password@127.0.0.1:55432/kookia_demo");
  assert.throws(() => buildDisposablePostgresArgs("unsafe", "password", { database: "kookia" }));
});

test("retries the requested database and skips probes after interruption", async (t) => {
  let attempts = 0;
  const docker = mockDocker(t, () => ({ status: ++attempts === 1 ? 1 : 0 }));
  await waitForPostgres("kookia-demo-test", "kookia_demo", () => false);
  await assert.rejects(waitForPostgres("kookia-demo-test", "kookia_demo", () => true), /interrompu/);
  const probe = ["exec", "kookia-demo-test", "pg_isready", "-U", "kookia", "-d", "kookia_demo"];
  assert.deepEqual(docker.calls.map(call => call.arguments[1]), [probe, probe]);
});

test("reports when Docker cannot confirm that the temporary container is gone", (t) => {
  let inspected = { status: 1, stderr: "Error: No such object: kookia-demo-test" };
  const docker = mockDocker(t, ([operation]) => operation === "rm" ? { status: 1 } : inspected);
  const logError = t.mock.method(console, "error", () => {});
  const initialExitCode = process.exitCode;
  t.after(() => { process.exitCode = initialExitCode; });

  cleanupContainer("kookia-demo-test");
  assert.equal(process.exitCode, initialExitCode);
  assert.equal(logError.mock.callCount(), 0);

  inspected = { status: 1, stderr: "failed to connect to the docker API: connect: no such file or directory" };
  cleanupContainer("kookia-demo-test");
  assert.equal(process.exitCode, 1);
  assert.match(logError.mock.calls[0].arguments[0], /Nettoyage Docker non confirmé.*kookia-demo-test/);
  const remove = ["rm", "--force", "kookia-demo-test"];
  const inspect = ["inspect", "kookia-demo-test"];
  assert.deepEqual(docker.calls.map(call => call.arguments[1]), [remove, inspect, remove, inspect]);
});
