import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { parseSalesCsv } from "./salesCsv.js";
import { ensureOpenPartialServiceDay } from "./salesService.js";
import { lockSalesWorkspace } from "./salesContributionLedger.js";

type ImportMapping = Record<string, string>;
type CsvRows = ReturnType<typeof parseSalesCsv>["rows"];
type SaleItemSnapshot = { id: string; name: string; normalizedName: string };
const key = (date: string, id: string) => `${date}:${id}`;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const dateKey = (value: Date) => value.toISOString().slice(0, 10);
const bounded = (value: string, length: number) => value.slice(0, length);

const outcomes = {
  ready: { status: "accepted", kind: "accepted", message: undefined,
    reason: "Ligne acceptée lors de la confirmation de l’import." },
  invalid: { status: "rejected", kind: "rejected", message: undefined,
    reason: "Ligne rejetée pendant la revue d’import." },
  unmapped: { status: "rejected", kind: "rejected", message: "Associez cet article à un article vendu du restaurant.",
    reason: "Article source sans correspondance dans cet espace." },
  duplicate: { status: "rejected", kind: "rejected", message: "Même article et date déjà présents dans ce fichier.",
    reason: "Doublon dans le même lot ; aucune addition implicite." },
  closed: { status: "rejected", kind: "rejected", message: "Le calendrier indique que le restaurant était fermé ce jour-là.",
    reason: "Service déclaré fermé." },
  existing: { status: "pending", kind: "conflict_detected", message: "Une vente existe déjà ; elle devra être gardée ou remplacée explicitement.",
    reason: "Vente déjà acceptée pour cet article et cette date ; revue requise." },
} as const;
type RowStatus = keyof typeof outcomes;

function explicitMapping(mapping: ImportMapping, name: string) {
  return Object.hasOwn(mapping, name) ? mapping[name] : undefined;
}

function importIdentity(restaurantId: string, fileHash: string, mapping: ImportMapping, rows: CsvRows) {
  const names = [...new Set(rows.map((row) => row.itemName))].sort();
  const mappingSnapshot = Object.fromEntries(names.flatMap((name) => {
    if (name.length > 120) return [];
    const itemId = explicitMapping(mapping, name);
    return itemId ? [[name, itemId]] : [];
  }));
  const mappingHash = digest(JSON.stringify(mappingSnapshot));
  return { mappingSnapshot, mappingHash, hash: digest(`${fileHash}:${mappingHash}`),
    where: { restaurantId_fileHash_mappingHash: { restaurantId, fileHash, mappingHash } } };
}

async function loadImportFacts(db: Prisma.TransactionClient, restaurantId: string, rows: CsvRows) {
  const dates = [...new Set(rows.filter((row) => !row.error).map((row) => row.serviceDate))].map(dateValue);
  const where = { restaurantId, serviceDate: { in: dates } };
  const [items, sales, days] = await Promise.all([
    db.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true, normalizedName: true } }),
    db.dailySale.findMany({ where, select: { serviceDate: true, saleItemId: true } }),
    db.serviceDay.findMany({ where: { ...where, status: "closed" }, select: { serviceDate: true } }),
  ]);
  return { items, occupied: new Set(sales.map((sale) => key(dateKey(sale.serviceDate), sale.saleItemId))),
    closedDates: new Set(days.map((day) => dateKey(day.serviceDate))) };
}

function classifyRows(rows: CsvRows, mapping: ImportMapping, { items, occupied, closedDates }: Awaited<ReturnType<typeof loadImportFacts>>) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const byName = new Map(items.map((item) => [item.normalizedName, item]));
  const seen = new Set<string>();
  return rows.map((row): { row: CsvRows[number]; item?: SaleItemSnapshot; status: RowStatus } => {
    if (row.error) return { row, status: "invalid" };
    const mappedId = explicitMapping(mapping, row.itemName);
    const item = mappedId ? byId.get(mappedId) : byName.get(row.itemName.toLocaleLowerCase("fr-FR"));
    if (!item) return { row, status: "unmapped" };
    const identity = key(row.serviceDate, item.id);
    if (seen.has(identity)) return { row, item, status: "duplicate" };
    seen.add(identity);
    if (closedDates.has(row.serviceDate)) return { row, item, status: "closed" };
    if (occupied.has(identity)) return { row, item, status: "existing" };
    return { row, item, status: "ready" };
  });
}

function countOutcomes(rows: ReturnType<typeof classifyRows>) {
  const acceptedCount = rows.filter(({ status }) => status === "ready").length;
  const conflictCount = rows.filter(({ status }) => status === "existing").length;
  return { acceptedCount, conflictCount, rejectedCount: rows.length - acceptedCount - conflictCount };
}

const importCounts = { id: true, acceptedCount: true, rejectedCount: true, conflictCount: true } as const;

export async function previewSalesImport(restaurantId: string, csv: string, mapping: ImportMapping, today: string) {
  const { hash: fileHash, rows } = parseSalesCsv(csv, today);
  const { hash, where } = importIdentity(restaurantId, fileHash, mapping, rows);
  const [facts, previous] = await Promise.all([
    loadImportFacts(prisma, restaurantId, rows),
    prisma.saleImport.findUnique({ where, select: { id: true } }),
  ]);
  const classified = classifyRows(rows, mapping, facts);
  const { acceptedCount, rejectedCount, conflictCount } = countOutcomes(classified);
  return { hash, alreadyImported: Boolean(previous), readyCount: acceptedCount, rejectedCount, conflictCount,
    rows: classified.map(({ row, item, status }) => ({ ...row, status,
      ...(item ? { saleItemId: item.id, saleItemName: item.name } : {}),
      message: row.error ?? outcomes[status].message,
    })) };
}

export async function commitSalesImport(restaurantId: string, actorId: string, csv: string,
  mapping: ImportMapping, expectedHash: string, today: string) {
  const { hash: fileHash, rows } = parseSalesCsv(csv, today);
  const { hash, mappingSnapshot, mappingHash, where } = importIdentity(restaurantId, fileHash, mapping, rows);
  if (hash !== expectedHash) throw new WorkspaceError(409, "IMPORT_CHANGED", "Le fichier ou ses correspondances ont changé depuis l’aperçu.");

  try {
    return await prisma.$transaction(async (tx) => {
      await lockSalesWorkspace(tx, restaurantId);
      const prior = await tx.saleImport.findUnique({ where, select: importCounts });
      if (prior) return { ...prior, alreadyImported: true };

      const classified = classifyRows(rows, mapping, await loadImportFacts(tx, restaurantId, rows));
      const counts = countOutcomes(classified);
      const { id: importId } = await tx.saleImport.create({ data: { restaurantId, fileHash, mappingHash,
        mappingSnapshot, ...counts, createdBy: actorId }, select: { id: true } });
      const now = new Date();
      const acceptedDates = new Set<string>();
      const contributions: Prisma.SaleContributionCreateManyInput[] = [];
      const events: Prisma.SaleContributionEventCreateManyInput[] = [];
      const sales: Prisma.DailySaleCreateManyInput[] = [];

      for (const { row, item, status: verdict } of classified) {
        const { status, kind } = outcomes[verdict];
        const reason = row.error ?? outcomes[verdict].reason;
        const accepted = status === "accepted";
        const revision = Number(accepted);
        const sourceKey = `csv:${fileHash}:${mappingHash}:${row.line}`;
        const id = randomUUID();
        const serviceDate = row.validServiceDate ? dateValue(row.serviceDate) : null;
        const quantity = row.validQuantity ? row.quantity : null;
        const sourceItemName = bounded(row.itemName, 120);
        const saleItemId = item?.id ?? null;
        contributions.push({
          id, restaurantId, source: "csv", sourceKey, sourceRevision: 1, importId, importLine: row.line,
          sourceItemName, sourceDate: bounded(row.serviceDate, 40), serviceDate, sourceQuantity: row.sourceQuantity,
          quantity, saleItemId, status, reviewRevision: revision,
          reviewedBy: accepted ? actorId : null, reviewedAt: accepted ? now : null,
          reviewReason: status === "pending" ? null : reason, createdAt: now,
        });
        events.push({ id: randomUUID(), restaurantId, contributionId: id, operationId: `create:${sourceKey}`,
          revision, kind, actorId, reason: bounded(reason, 240), createdAt: now,
          snapshot: { sourceItemName, sourceDate: row.serviceDate, sourceQuantity: row.sourceQuantity,
            mappedSaleItemId: saleItemId, mappedSaleItemName: item?.name ?? null, reviewStatus: status },
        });
        if (accepted && saleItemId && serviceDate && quantity !== null) {
          acceptedDates.add(row.serviceDate);
          sales.push({ restaurantId, saleItemId, serviceDate, quantity, source: "csv",
            operationId: sourceKey, importId, importLine: row.line, contributionId: id,
            createdBy: actorId, updatedBy: actorId, createdAt: now, updatedAt: now });
        }
      }
      for (const day of acceptedDates) await ensureOpenPartialServiceDay(tx, restaurantId, actorId, day);
      for (let index = 0; index < contributions.length; index += 500) {
        await tx.saleContribution.createMany({ data: contributions.slice(index, index + 500) });
        await tx.saleContributionEvent.createMany({ data: events.slice(index, index + 500) });
      }
      for (let index = 0; index < sales.length; index += 500) await tx.dailySale.createMany({ data: sales.slice(index, index + 500) });
      return { id: importId, alreadyImported: false, ...counts };
    }, { maxWait: 20_000, timeout: 60_000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await prisma.saleImport.findUnique({ where, select: importCounts });
      if (repeated) return { ...repeated, alreadyImported: true };
      throw new WorkspaceError(409, "IMPORT_CONFLICT", "Les ventes ont changé depuis l’aperçu. Rechargez le fichier.");
    }
    throw error;
  }
}
