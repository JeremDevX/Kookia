import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { prisma } from "../infrastructure/database/prisma.js";

afterAll(async () => { await prisma.$disconnect(); });
it("adds unknown opening days without changing existing restaurants", async () => {
  const migration = readFileSync(new URL("../../../prisma/migrations/20261103010000_restaurant_opening_days/migration.sql", import.meta.url), "utf8");
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`CREATE TEMPORARY TABLE "Restaurant" (id text PRIMARY KEY, name text NOT NULL) ON COMMIT DROP`;
    await tx.$executeRaw`INSERT INTO pg_temp."Restaurant" (id, name) VALUES ('opening-fixture', 'Synthetic restaurant')`;
    await tx.$executeRawUnsafe(migration);
    expect(await tx.$queryRaw`SELECT id, name, "openingWeekdays" FROM pg_temp."Restaurant"`).toEqual([
      { id: "opening-fixture", name: "Synthetic restaurant", openingWeekdays: null },
    ]);
    await tx.$executeRaw`UPDATE pg_temp."Restaurant" SET "openingWeekdays" = '[]'::jsonb`;
    expect(await tx.$queryRaw`SELECT id, name FROM pg_temp."Restaurant"`).toEqual([
      { id: "opening-fixture", name: "Synthetic restaurant" },
    ]);
  });
});
