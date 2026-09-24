import assert from "node:assert/strict";
import test from "node:test";
import { buildDisposablePostgresArgs, integrationDatabaseUrl, localDemoDatabaseUrl, parseLoopbackPort } from "./localDeliveryRecipe.mjs";

test("publishes only a loopback port and uses volatile database and dump storage", () => {
  const args = buildDisposablePostgresArgs("kookia-r0-test", "temporary-password");
  assert.equal(parseLoopbackPort("127.0.0.1:55432\n"), 55432);
  assert.throws(() => parseLoopbackPort("0.0.0.0:55432"));
  assert.ok(args.includes("127.0.0.1::5432/tcp"));
  assert.ok(args.includes("/var/lib/postgresql/data:rw,noexec,nosuid,size=2g"));
  assert.ok(args.includes("/tmp:rw,noexec,nosuid,size=512m"));
  assert.equal(args.includes("--volume"), false);
});

test("creates only the guarded local integration database URLs", () => {
  assert.equal(integrationDatabaseUrl(55432, "temporary-password"),
    "postgresql://kookia:temporary-password@127.0.0.1:55432/kookia_test");
  assert.throws(() => integrationDatabaseUrl(55432, "temporary-password", "kookia"));
});

test("isolates the interactive demo in its own tmpfs-only database", () => {
  const args = buildDisposablePostgresArgs("kookia-demo-test", "temporary-password", {
    database: "kookia_demo", scope: "disposable-local-demo",
  });
  assert.ok(args.includes("kookia.scope=disposable-local-demo"));
  assert.ok(args.includes("POSTGRES_DB=kookia_demo"));
  assert.ok(args.includes("pg_isready -U kookia -d kookia_demo"));
  assert.equal(localDemoDatabaseUrl(55432, "temporary-password"),
    "postgresql://kookia:temporary-password@127.0.0.1:55432/kookia_demo");
  assert.throws(() => buildDisposablePostgresArgs("unsafe", "password", { database: "kookia" }));
});
