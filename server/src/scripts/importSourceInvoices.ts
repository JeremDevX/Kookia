import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { readSourceInvoices, type SourceInvoice, type SourceLine } from "./sourceInvoices.js";
import { sourceProductCategory } from "./sourceProductCategory.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage : npm run import:invoices -- adresse@restaurant.fr");

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const money = (value: number) => Math.round(value * 10_000) / 10_000;
const stock = (value: number) => Math.round(value * 1000) / 1000;
const simulatedUse = (line: SourceLine, fraction: number) => line.unit === "pcs" ? Math.floor(line.quantity * fraction) : stock(line.quantity * fraction);
const threshold = (line: SourceLine) => line.unit === "pcs" ? Math.floor(line.quantity * 0.2) : stock(line.quantity * 0.2);
const day = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);
const supplierId = (name: string) => `invoice-supplier-${hash(name.toLocaleLowerCase("fr"))}`;
const productId = (supplier: string, line: SourceLine) => `invoice-product-${hash(`${supplier}|${line.code ?? line.name}|${line.unit}`.toLocaleLowerCase("fr"))}`;

function groupLines(invoice: SourceInvoice, sourceLines = invoice.stockLines) {
  const grouped = new Map<string, SourceLine>();
  for (const line of sourceLines) {
    const id = productId(invoice.supplier, line);
    const prior = grouped.get(id);
    grouped.set(id, prior ? { ...prior, quantity: stock(prior.quantity + line.quantity),
      unitPrice: money((prior.quantity * prior.unitPrice + line.quantity * line.unitPrice) / (prior.quantity + line.quantity)) } : line);
  }
  return [...grouped].map(([id, line]) => ({ id, line }));
}

const lineKey = (line: SourceLine) => [line.name, line.quantity, line.unit, line.unitPrice, line.code ?? ""].join("|");
function lineChanges(invoice: SourceInvoice, previous: SourceLine[]) {
  const remaining = [...invoice.stockLines];
  const renamed: SourceLine[] = [];
  for (const line of previous) {
    let index = remaining.findIndex((candidate) => lineKey(candidate) === lineKey(line));
    if (index < 0 && line.code) {
      index = remaining.findIndex((candidate) => candidate.code === line.code && candidate.quantity === line.quantity
        && candidate.unit === line.unit && candidate.unitPrice === line.unitPrice);
      if (index >= 0) renamed.push(remaining[index]);
    }
    if (index < 0) throw new Error(`Une ligne déjà importée a disparu : ${invoice.file}`);
    remaining.splice(index, 1);
  }
  return { added: remaining, renamed };
}

const invoices = readSourceInvoices();
const user = await prisma.user.findUnique({ where: { emailNormalized: email }, include: { restaurant: true } });
if (!user?.restaurant) throw new Error("Compte ou espace restaurant introuvable.");
const restaurantId = user.restaurant.id;
let imported = 0;
let completed = 0;
let correctedNames = 0;
let correctedUnits = 0;
let recategorized = 0;
let receipts = 0;
let simulatedExits = 0;
const seenProducts = new Set(invoices.flatMap((invoice) => groupLines(invoice).map(({ id }) => id)));

try {
  for (const invoice of invoices.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.id.localeCompare(b.id))) {
    const kind = `source-invoice:${invoice.id}`;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind } } });
      if (existing) {
        const previousHash = (existing.data as { contentHash?: string }).contentHash;
        if (previousHash !== invoice.contentHash) throw new Error(`Fiche modifiée depuis l’import : ${invoice.file}`);
      }
      const changes = existing ? lineChanges(invoice, (existing.data as unknown as { stockLines: SourceLine[] }).stockLines)
        : { added: invoice.stockLines, renamed: [] };
      const additions = changes.added;
      if (existing && !additions.length && !changes.renamed.length) return { imported: false, completed: false, receipts: 0, exits: 0, names: 0 };
      const lines = groupLines(invoice, additions);
      const correctionId = `source-correction:${invoice.id}:${hash(additions.map(lineKey).join(";"))}`;
      if (lines.length) {
        const id = supplierId(invoice.supplier);
        await tx.supplier.upsert({ where: { restaurantId_id: { restaurantId, id } },
          create: { restaurantId, id, name: invoice.supplier.slice(0, 120), email: "", phone: "" }, update: {} });
      }
      let exits = 0;
      for (const { id, line } of lines) {
        const existingProduct = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id } } });
        if (!existingProduct) await tx.product.create({ data: { restaurantId, id, supplierId: supplierId(invoice.supplier),
          name: line.name, category: sourceProductCategory(line.name, invoice.supplier), unit: line.unit, currentStock: 0,
          minThreshold: threshold(line), pricePerUnit: line.unitPrice } });
        const priorStock = existingProduct ? Number(existingProduct.currentStock) : 0;
        if (!existing && priorStock > 0) {
          await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: 0 } });
          await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: -priorStock,
            reason: "simulated_consumption", operationId: `source-next:${invoice.id}`,
            actorId: user.id, createdAt: day(invoice.date!, 8) } });
          exits++;
        }
        await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: {
          currentStock: { increment: line.quantity },
          ...(!existingProduct?.lastDelivery || existingProduct.lastDelivery <= day(invoice.date!, 12)
            ? { pricePerUnit: line.unitPrice, minThreshold: threshold(line), lastDelivery: day(invoice.date!, 12) } : {}),
        } });
        await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: line.quantity,
          reason: "invoice_import_demo", operationId: existing ? correctionId : `source-receipt:${invoice.id}`,
          actorId: user.id, createdAt: day(invoice.date!, 12) } });
        if (existing) {
          const final = await tx.stockMovement.findUnique({ where: { restaurantId_operationId_productId: {
            restaurantId, operationId: `source-final:${id}`, productId: id } } });
          const fraction = invoice.date! < new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10) ? 0.75 : 0.4;
          const used = final ? simulatedUse(line, fraction) : 0;
          if (used > 0) {
            await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: { decrement: used } } });
            await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: -used,
              reason: "simulated_consumption", operationId: `${correctionId}:use`, actorId: user.id,
              createdAt: day(invoice.date!, 18) } });
            exits++;
          }
        }
      }
      for (const line of changes.renamed) {
        await tx.product.update({ where: { restaurantId_id: { restaurantId, id: productId(invoice.supplier, line) } },
          data: { name: line.name, category: sourceProductCategory(line.name, invoice.supplier) } });
      }
      if (existing) await tx.workspaceDocument.update({ where: { restaurantId_kind: { restaurantId, kind } },
        data: { data: invoice as unknown as Prisma.InputJsonValue, revision: { increment: 1 } } });
      else await tx.workspaceDocument.create({ data: { restaurantId, kind, data: invoice as unknown as Prisma.InputJsonValue } });
      return { imported: !existing, completed: !!existing, receipts: lines.length, exits, names: changes.renamed.length };
    });
    if (result.imported) imported++;
    if (result.completed) completed++;
    correctedNames += result.names;
    receipts += result.receipts;
    simulatedExits += result.exits;
  }

  // The latest delivery also needs an explicitly simulated use; old supplies should not remain untouched.
  for (const id of seenProducts) {
    const operationId = `source-final:${id}`;
    await prisma.$transaction(async (tx) => {
      const prior = await tx.stockMovement.findUnique({ where: { restaurantId_operationId_productId: { restaurantId, operationId, productId: id } } });
      if (prior) return;
      const product = await tx.product.findUniqueOrThrow({ where: { restaurantId_id: { restaurantId, id } } });
      const available = Number(product.currentStock);
      const latest = product.lastDelivery?.toISOString().slice(0, 10) ?? "";
      const fraction = latest < new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10) ? 0.75 : 0.4;
      const used = product.unit === "pcs" ? Math.floor(available * fraction) : stock(available * fraction);
      if (used <= 0) return;
      await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: { decrement: used } } });
      await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: -used,
        reason: "simulated_consumption", operationId, actorId: user.id,
        createdAt: latest ? day(latest, 18) : new Date() } });
      simulatedExits++;
    });
  }
  for (const product of await prisma.product.findMany({ where: { restaurantId, id: { startsWith: "invoice-product-" } }, include: { supplier: true } })) {
    const category = sourceProductCategory(product.name, product.supplier?.name ?? "");
    if (product.category !== category) {
      await prisma.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } }, data: { category } });
      recategorized++;
    }
    if (product.unit !== "pcs") continue;
    const available = Number(product.currentStock);
    const correction = stock(Math.ceil(available) - available);
    const minimum = Math.floor(Number(product.minThreshold));
    if (correction <= 0 && minimum === Number(product.minThreshold)) continue;
    await prisma.$transaction(async (tx) => {
      if (correction > 0) {
        await tx.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } },
          data: { currentStock: { increment: correction }, minThreshold: minimum } });
        await tx.stockMovement.create({ data: { restaurantId, productId: product.id, delta: correction,
          reason: "simulated_unit_rounding", operationId: `source-unit-rounding:${product.id}`,
          actorId: user.id } });
        correctedUnits++;
      } else await tx.product.update({ where: { restaurantId_id: { restaurantId, id: product.id } }, data: { minThreshold: minimum } });
    });
  }
  console.info(JSON.stringify({ account: email, sourceInvoices: invoices.length, imported, completed, correctedNames,
    correctedUnits, recategorized, stockReceipts: receipts, simulatedExits,
    unquantifiedOrExcluded: invoices.filter((invoice) => !invoice.stockLines.length).length }));
} finally {
  await prisma.$disconnect();
}
