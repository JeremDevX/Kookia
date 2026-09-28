import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { prisma } from "../infrastructure/database/prisma.js";

afterAll(async () => { await prisma.$disconnect(); });

it("preserves existing restaurant rows and old column reads during the additive migration", async () => {
  const migration = readFileSync(new URL("../../../prisma/migrations/20260928000000_restaurant_terrace/migration.sql", import.meta.url), "utf8");
  await prisma.$transaction(async tx => {
    // Connection-local temporary table shadows the real table; no persisted tenant is touched.
    await tx.$executeRaw`CREATE TEMPORARY TABLE "Restaurant" (id text PRIMARY KEY, name text NOT NULL) ON COMMIT DROP`;
    await tx.$executeRaw`INSERT INTO pg_temp."Restaurant" (id, name) VALUES ('terrace-migration-fixture', 'Synthetic restaurant')`;
    await tx.$executeRawUnsafe(migration);
    expect(await tx.$queryRaw`SELECT id, name, "hasTerrace" FROM pg_temp."Restaurant"`).toEqual([
      { id: "terrace-migration-fixture", name: "Synthetic restaurant", hasTerrace: null },
    ]);
    await tx.$executeRaw`UPDATE pg_temp."Restaurant" SET "hasTerrace" = true`;
    // Rollback strategy: previous application ignores the additive column; no DROP or data rewrite.
    expect(await tx.$queryRaw`SELECT id, name FROM pg_temp."Restaurant"`).toEqual([
      { id: "terrace-migration-fixture", name: "Synthetic restaurant" },
    ]);
  });
});
