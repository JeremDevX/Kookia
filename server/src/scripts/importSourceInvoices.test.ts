import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { parseSourceInvoice } from "./sourceInvoices.js";

const { findMany, createMany, disconnect, readSourceInvoices, resolveCamilleRestaurantId } = vi.hoisted(() => ({
  findMany: vi.fn(), createMany: vi.fn(), disconnect: vi.fn(), readSourceInvoices: vi.fn(), resolveCamilleRestaurantId: vi.fn(),
}));
vi.mock("../config/env.js", () => ({ env: { DATABASE_URL: "postgresql://127.0.0.1/kookia" } }));
vi.mock("../infrastructure/database/prisma.js", () => ({ prisma: { workspaceDocument: { findMany, createMany }, $disconnect: disconnect } }));
vi.mock("./restaurantSimulationTarget.js", () => ({ resolveCamilleRestaurantId }));
vi.mock("./sourceInvoices.js", async (importOriginal) => ({ ...await importOriginal<typeof import("./sourceInvoices.js")>(), readSourceInvoices }));

const originalArgs = process.argv;
const restaurantId = "source-import-fixture";
const contents = "# Fournisseur fictif — Facture\n- Date décalée de la pièce (démonstration) : 2026-09-22\n- Date (pièce d’origine) : 2021-12-29";
const invoice = parseSourceInvoice("new.md", contents);
const archived = parseSourceInvoice("archived.md", contents);
const archiveKind = `source-invoice:${archived.id}`;
const archivedRow = { kind: archiveKind, data: archived };

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  resolveCamilleRestaurantId.mockResolvedValue({ restaurantId });
  readSourceInvoices.mockReturnValue([invoice, archived]);
  findMany.mockResolvedValue([archivedRow]);
  vi.spyOn(console, "info").mockImplementation(() => {});
  process.argv = originalArgs.slice(0, 2);
});

afterEach(() => {
  process.argv = originalArgs;
  vi.restoreAllMocks();
});

it.each([
  { date: "2026-02-30", field: "date", write: false },
  { date: "2021-02-29", field: "originalDate", write: true },
] as const)("refuses an impossible $field before reading the archive", async ({ date, field, write }) => {
  if (write) process.argv.push("--write");
  readSourceInvoices.mockReturnValue([invoice, { ...archived, [field]: date }]);

  await expect(import("./importSourceInvoices.js")).rejects.toThrow(`Fiche source invalide : archived.md (${field})`);
  expect(resolveCamilleRestaurantId).not.toHaveBeenCalled();
  expect(createMany).not.toHaveBeenCalled();
});

it("leaves the entire batch untouched when a later archive entry differs", async () => {
  process.argv.push("--write");
  findMany.mockResolvedValue([{ kind: archiveKind, data: { contentHash: "different" } }]);

  await expect(import("./importSourceInvoices.js")).rejects.toThrow("Fiche modifiée depuis l’import : archived.md");
  expect(createMany).not.toHaveBeenCalled();
});

it("archives the missing entries together and skips them on replay", async () => {
  process.argv.push("--write");
  const another = parseSourceInvoice("another.md", contents);
  readSourceInvoices.mockReturnValue([invoice, archived, another]);
  const additions = [invoice, another].map(data => ({ restaurantId, kind: `source-invoice:${data.id}`, data }));

  await import("./importSourceInvoices.js");
  expect(createMany).toHaveBeenCalledExactlyOnceWith({ data: additions });

  vi.resetModules();
  findMany.mockResolvedValue([archivedRow, ...additions]);
  await import("./importSourceInvoices.js");
  expect(createMany).toHaveBeenCalledTimes(1);
});
