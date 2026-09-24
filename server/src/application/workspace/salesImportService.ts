import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { parseSalesCsv } from "./salesCsv.js";
import { ensureOpenPartialServiceDay } from "./salesService.js";
import { lockSalesWorkspace } from "./salesContributionLedger.js";

export interface ImportMapping { [itemName: string]: string }
type PreviewRow = {
  line: number; serviceDate: string; itemName: string; quantity: number;
  saleItemId?: string; saleItemName?: string;
  status: "ready" | "invalid" | "unmapped" | "duplicate" | "existing" | "closed";
  message?: string;
};
const key = (date: string, id: string) => `${date}:${id}`;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const bounded = (value: string, length: number) => value.slice(0, length);

function mappingSnapshot(mapping: ImportMapping, names: string[]) {
  return Object.fromEntries([...new Set(names)].sort().flatMap((name) => mapping[name] ? [[bounded(name, 120), mapping[name]]] : []));
}

export async function previewSalesImport(restaurantId: string, csv: string, mapping: ImportMapping, today: string) {
  const parsed = parseSalesCsv(csv, today);
  const items = await prisma.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true, normalizedName: true } });
  const byId = new Map(items.map((item) => [item.id, item]));
  const byName = new Map(items.map((item) => [item.normalizedName, item]));
  const validDates = [...new Set(parsed.rows.filter((row) => !row.error).map((row) => row.serviceDate))];
  const existing = validDates.length ? await prisma.dailySale.findMany({
    where: { restaurantId, serviceDate: { in: validDates.map(dateValue) } }, select: { serviceDate: true, saleItemId: true },
  }) : [];
  const occupied = new Set(existing.map((sale) => key(sale.serviceDate.toISOString().slice(0, 10), sale.saleItemId)));
  const closedDays = await prisma.serviceDay.findMany({
    where: { restaurantId, serviceDate: { in: validDates.map(dateValue) }, status: "closed" }, select: { serviceDate: true },
  });
  const closedDates = new Set(closedDays.map((row) => row.serviceDate.toISOString().slice(0, 10)));
  const seen = new Set<string>();
  const rows: PreviewRow[] = parsed.rows.map((row) => {
    if (row.error) return { ...row, status: "invalid", message: row.error };
    const item = mapping[row.itemName] ? byId.get(mapping[row.itemName]) : byName.get(row.itemName.toLocaleLowerCase("fr-FR"));
    if (!item) return { ...row, status: "unmapped", message: "Associez cet article à un article vendu du restaurant." };
    const identity = key(row.serviceDate, item.id);
    if (seen.has(identity)) return { ...row, saleItemId: item.id, saleItemName: item.name,
      status: "duplicate", message: "Même article et date déjà présents dans ce fichier." };
    seen.add(identity);
    if (occupied.has(identity)) return { ...row, saleItemId: item.id, saleItemName: item.name,
      status: "existing", message: "Une vente existe déjà ; elle devra être gardée ou remplacée explicitement." };
    if (closedDates.has(row.serviceDate)) return { ...row, saleItemId: item.id, saleItemName: item.name,
      status: "closed", message: "Le calendrier indique que le restaurant était fermé ce jour-là." };
    return { ...row, saleItemId: item.id, saleItemName: item.name, status: "ready" };
  });
  const names = parsed.rows.map((row) => row.itemName);
  const normalizedMapping = mappingSnapshot(mapping, names);
  const mappingHash = digest(JSON.stringify(normalizedMapping));
  const reviewHash = digest(`${parsed.hash}:${mappingHash}`);
  const previous = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash_mappingHash: {
    restaurantId, fileHash: parsed.hash, mappingHash,
  } }, select: { id: true, acceptedCount: true, rejectedCount: true, conflictCount: true } });
  return { hash: reviewHash, alreadyImported: Boolean(previous), rows,
    readyCount: rows.filter((row) => row.status === "ready").length,
    conflictCount: rows.filter((row) => row.status === "existing").length,
    rejectedCount: rows.filter((row) => !["ready", "existing"].includes(row.status)).length };
}

export async function commitSalesImport(restaurantId: string, actorId: string, csv: string,
  mapping: ImportMapping, expectedHash: string, today: string) {
  const preview = await previewSalesImport(restaurantId, csv, mapping, today);
  if (preview.hash !== expectedHash) throw new WorkspaceError(409, "IMPORT_CHANGED", "Le fichier ou ses correspondances ont changé depuis l’aperçu.");
  const parsed = parseSalesCsv(csv, today);
  const normalizedMapping = mappingSnapshot(mapping, parsed.rows.map((row) => row.itemName));
  const mappingHash = digest(JSON.stringify(normalizedMapping));
  const prior = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash_mappingHash: {
    restaurantId, fileHash: parsed.hash, mappingHash,
  } } });
  if (prior) return { id: prior.id, alreadyImported: true, acceptedCount: prior.acceptedCount,
    rejectedCount: prior.rejectedCount, conflictCount: prior.conflictCount };
  const items = await prisma.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true, normalizedName: true } });
  const byId = new Map(items.map((item) => [item.id, item]));
  const byName = new Map(items.map((item) => [item.normalizedName, item]));
  const allDates = [...new Set(parsed.rows.filter((row) => !row.error).map((row) => row.serviceDate))];
  const seen = new Set<string>();
  const acceptedDates = new Set<string>();
  const contributions: Prisma.SaleContributionCreateManyInput[] = [];
  const events: Prisma.SaleContributionEventCreateManyInput[] = [];
  const sales: Prisma.DailySaleCreateManyInput[] = [];
  const now = new Date();
  let acceptedCount = 0, rejectedCount = 0, conflictCount = 0;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await lockSalesWorkspace(tx, restaurantId);
      const existing = allDates.length ? await tx.dailySale.findMany({ where: {
        restaurantId, serviceDate: { in: allDates.map(dateValue) },
      }, select: { serviceDate: true, saleItemId: true } }) : [];
      const occupied = new Set(existing.map((sale) => key(sale.serviceDate.toISOString().slice(0, 10), sale.saleItemId)));
      const closedDates = new Set((allDates.length ? await tx.serviceDay.findMany({ where: { restaurantId,
        serviceDate: { in: allDates.map(dateValue) }, status: "closed" }, select: { serviceDate: true } }) : [])
        .map((day) => day.serviceDate.toISOString().slice(0, 10)));
      const record = await tx.saleImport.create({ data: { restaurantId, fileHash: parsed.hash, mappingHash,
        mappingSnapshot: normalizedMapping as Prisma.InputJsonValue, acceptedCount: 0, rejectedCount: 0, conflictCount: 0, createdBy: actorId } });

      for (const row of parsed.rows) {
        const sourceKey = `csv:${parsed.hash}:${mappingHash}:${row.line}`;
        const item = !row.error ? (mapping[row.itemName] ? byId.get(mapping[row.itemName]) : byName.get(row.itemName.toLocaleLowerCase("fr-FR"))) : undefined;
        const rowIdentity = item && !row.error ? key(row.serviceDate, item.id) : null;
        let status: "accepted" | "pending" | "rejected" = "rejected";
        let reason = row.error ?? (!item ? "Article source sans correspondance dans cet espace." : "Ligne rejetée pendant la revue d’import.");
        if (!row.error && item && rowIdentity) {
          if (seen.has(rowIdentity)) reason = "Doublon dans le même lot ; aucune addition implicite.";
          else if (closedDates.has(row.serviceDate)) reason = "Service déclaré fermé.";
          else if (occupied.has(rowIdentity)) { status = "pending"; reason = "Vente déjà acceptée pour cet article et cette date ; revue requise."; conflictCount++; }
          else {
            status = "accepted"; reason = "Ligne acceptée lors de la confirmation de l’import."; acceptedCount++;
            occupied.add(rowIdentity);
            acceptedDates.add(row.serviceDate);
          }
          seen.add(rowIdentity);
        }
        if (status === "rejected") rejectedCount++;
        const id = randomUUID();
        const serviceDate = row.validServiceDate ? dateValue(row.serviceDate) : null;
        const validQuantity = row.validQuantity ? row.quantity : null;
        const sourceItemName = bounded(row.itemName, 120);
        const contribution = {
          id, restaurantId, source: "csv" as const, sourceKey, sourceRevision: 1, importId: record.id, importLine: row.line,
          sourceItemName, sourceDate: bounded(row.serviceDate, 40), serviceDate, sourceQuantity: row.sourceQuantity,
          quantity: validQuantity, saleItemId: item?.id ?? null, status, reviewRevision: status === "accepted" ? 1 : 0,
          reviewedBy: status === "accepted" ? actorId : null, reviewedAt: status === "accepted" ? now : null,
          reviewReason: status === "pending" ? null : reason, createdAt: now,
        } satisfies Prisma.SaleContributionCreateManyInput;
        contributions.push(contribution);
        const eventKind = status === "accepted" ? "accepted" as const : status === "pending" ? "conflict_detected" as const : "rejected" as const;
        events.push({ id: randomUUID(), restaurantId, contributionId: id, operationId: `create:${sourceKey}`,
          revision: status === "accepted" ? 1 : 0, kind: eventKind, actorId, reason: bounded(reason, 240),
          snapshot: { sourceItemName, sourceDate: row.serviceDate, sourceQuantity: row.sourceQuantity,
            mappedSaleItemId: item?.id ?? null, mappedSaleItemName: item?.name ?? null, reviewStatus: status } as Prisma.InputJsonObject,
          createdAt: now });
        if (status === "accepted" && item && serviceDate && validQuantity !== null) {
          sales.push({ restaurantId, saleItemId: item.id, serviceDate, quantity: validQuantity, source: "csv",
            operationId: sourceKey, importId: record.id, importLine: row.line, contributionId: id,
            createdBy: actorId, updatedBy: actorId, createdAt: now, updatedAt: now });
        }
      }
      for (const day of acceptedDates) await ensureOpenPartialServiceDay(tx, restaurantId, actorId, day);
      for (let index = 0; index < contributions.length; index += 500) {
        await tx.saleContribution.createMany({ data: contributions.slice(index, index + 500) });
        await tx.saleContributionEvent.createMany({ data: events.slice(index, index + 500) });
      }
      for (let index = 0; index < sales.length; index += 500) await tx.dailySale.createMany({ data: sales.slice(index, index + 500) });
      await tx.saleImport.update({ where: { id: record.id }, data: { acceptedCount, rejectedCount, conflictCount } });
      return { id: record.id, alreadyImported: false, acceptedCount, rejectedCount, conflictCount };
    }, { maxWait: 20_000, timeout: 60_000 });
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash_mappingHash: {
        restaurantId, fileHash: parsed.hash, mappingHash,
      } } });
      if (repeated) return { id: repeated.id, alreadyImported: true, acceptedCount: repeated.acceptedCount,
        rejectedCount: repeated.rejectedCount, conflictCount: repeated.conflictCount };
      throw new WorkspaceError(409, "IMPORT_CONFLICT", "Les ventes ont changé depuis l’aperçu. Rechargez le fichier.");
    }
    throw error;
  }
}
