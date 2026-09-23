import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { parseSalesCsv } from "./salesCsv.js";

export interface ImportMapping { [itemName: string]: string }
type PreviewRow = {
  line: number; serviceDate: string; itemName: string; quantity: number;
  saleItemId?: string; saleItemName?: string;
  status: "ready" | "invalid" | "unmapped" | "duplicate" | "existing";
  message?: string;
};
const key = (date: string, id: string) => `${date}:${id}`;

export async function previewSalesImport(restaurantId: string, csv: string, mapping: ImportMapping, today: string) {
  const parsed = parseSalesCsv(csv, today);
  const items = await prisma.saleItem.findMany({ where: { restaurantId }, select: { id: true, name: true, normalizedName: true } });
  const byId = new Map(items.map((item) => [item.id, item]));
  const byName = new Map(items.map((item) => [item.normalizedName, item]));
  const validDates = [...new Set(parsed.rows.filter((row) => !row.error).map((row) => row.serviceDate))];
  const existing = validDates.length ? await prisma.dailySale.findMany({
    where: { restaurantId, serviceDate: { in: validDates.map((value) => new Date(`${value}T00:00:00Z`)) } },
    select: { serviceDate: true, saleItemId: true },
  }) : [];
  const occupied = new Set(existing.map((sale) => key(sale.serviceDate.toISOString().slice(0, 10), sale.saleItemId)));
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
      status: "existing", message: "Une vente existe déjà pour cet article et cette date." };
    return { ...row, saleItemId: item.id, saleItemName: item.name, status: "ready" };
  });
  const previous = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash: { restaurantId, fileHash: parsed.hash } },
    select: { id: true, acceptedCount: true, rejectedCount: true } });
  return { hash: parsed.hash, alreadyImported: Boolean(previous), rows,
    readyCount: rows.filter((row) => row.status === "ready").length,
    rejectedCount: rows.filter((row) => row.status !== "ready").length };
}

export async function commitSalesImport(restaurantId: string, actorId: string, csv: string,
  mapping: ImportMapping, expectedHash: string, today: string) {
  const preview = await previewSalesImport(restaurantId, csv, mapping, today);
  if (preview.hash !== expectedHash) throw new WorkspaceError(409, "IMPORT_CHANGED", "Le fichier a changé depuis l’aperçu.");
  const prior = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash: { restaurantId, fileHash: preview.hash } } });
  if (prior) return { id: prior.id, alreadyImported: true, acceptedCount: prior.acceptedCount, rejectedCount: prior.rejectedCount };
  const ready = preview.rows.filter((row) => row.status === "ready" && row.saleItemId);
  if (!ready.length) throw new WorkspaceError(400, "NO_VALID_ROWS", "Aucune ligne importable. Corrigez le fichier ou les correspondances.");
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.saleImport.create({ data: { restaurantId, fileHash: preview.hash,
        acceptedCount: ready.length, rejectedCount: preview.rejectedCount, createdBy: actorId } });
      await tx.dailySale.createMany({ data: ready.map((row) => ({
        restaurantId, saleItemId: row.saleItemId!, serviceDate: new Date(`${row.serviceDate}T00:00:00Z`),
        quantity: row.quantity, source: "csv", operationId: `csv:${preview.hash}:${row.line}`,
        importId: record.id, importLine: row.line, createdBy: actorId, updatedBy: actorId,
      })) });
      return { id: record.id, alreadyImported: false, acceptedCount: ready.length, rejectedCount: preview.rejectedCount };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const repeated = await prisma.saleImport.findUnique({ where: { restaurantId_fileHash: { restaurantId, fileHash: preview.hash } } });
      if (repeated) return { id: repeated.id, alreadyImported: true, acceptedCount: repeated.acceptedCount, rejectedCount: repeated.rejectedCount };
      throw new WorkspaceError(409, "IMPORT_CONFLICT", "Les ventes ont changé depuis l’aperçu. Rechargez le fichier.");
    }
    throw error;
  }
}
