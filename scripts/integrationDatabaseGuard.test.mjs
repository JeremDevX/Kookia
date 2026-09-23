import assert from "node:assert/strict";
import test from "node:test";
import { validateIntegrationDatabaseUrl } from "./integrationDatabaseGuard.mjs";

test("allows only the dedicated local integration database", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.doesNotThrow(() =>
      validateIntegrationDatabaseUrl(`postgresql://test:secret@${host}:5432/kookia_test`)
    );
  }
});

test("refuses missing, unknown, development, and non-local database URLs", () => {
  for (const databaseUrl of [
    undefined,
    "not a URL",
    "postgresql://test:secret@localhost:5432/kookia",
    "postgresql://test:secret@localhost:5432/other_test",
    "postgresql://test:secret@database:5432/kookia_test",
    "https://localhost/kookia_test",
  ]) {
    assert.throws(() => validateIntegrationDatabaseUrl(databaseUrl));
  }
});
