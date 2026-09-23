import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../infrastructure/database/prisma.js";
import { readSourceInvoices, type SourceInvoice, type SourceLine } from "./sourceInvoices.js";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage : npm run import:invoices -- adresse@restaurant.fr");

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);
const money = (value: number) => Math.round(value * 10_000) / 10_000;
const stock = (value: number) => Math.round(value * 1000) / 1000;
const day = (date: string, hour: number) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00.000Z`);
const supplierId = (name: string) => `invoice-supplier-${hash(name.toLocaleLowerCase("fr"))}`;
const productId = (supplier: string, line: SourceLine) => `invoice-product-${hash(`${supplier}|${line.code ?? line.name}|${line.unit}`.toLocaleLowerCase("fr"))}`;

function groupLines(invoice: SourceInvoice) {
  const grouped = new Map<string, SourceLine>();
  for (const line of invoice.stockLines) {
    const id = productId(invoice.supplier, line);
    const prior = grouped.get(id);
    grouped.set(id, prior ? { ...prior, quantity: stock(prior.quantity + line.quantity),
      unitPrice: money((prior.quantity * prior.unitPrice + line.quantity * line.unitPrice) / (prior.quantity + line.quantity)) } : line);
  }
  return [...grouped].map(([id, line]) => ({ id, line }));
}

const invoices = readSourceInvoices();
const user = await prisma.user.findUnique({ where: { emailNormalized: email }, include: { restaurant: true } });
if (!user?.restaurant) throw new Error("Compte ou espace restaurant introuvable.");
const restaurantId = user.restaurant.id;
let imported = 0;
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
        return { imported: false, receipts: 0, exits: 0 };
      }
      const lines = groupLines(invoice);
      if (lines.length) {
        const id = supplierId(invoice.supplier);
        await tx.supplier.upsert({ where: { restaurantId_id: { restaurantId, id } },
          create: { restaurantId, id, name: invoice.supplier.slice(0, 120), email: "", phone: "" }, update: {} });
      }
      let exits = 0;
      for (const { id, line } of lines) {
        const existingProduct = await tx.product.findUnique({ where: { restaurantId_id: { restaurantId, id } } });
        if (!existingProduct) await tx.product.create({ data: { restaurantId, id, supplierId: supplierId(invoice.supplier),
          name: line.name, category: "Factures importées", unit: line.unit, currentStock: 0,
          minThreshold: stock(line.quantity * 0.2), pricePerUnit: line.unitPrice } });
        const priorStock = existingProduct ? Number(existingProduct.currentStock) : 0;
        if (priorStock > 0) {
          await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: 0 } });
          await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: -priorStock,
            reason: "simulated_consumption", operationId: `source-next:${invoice.id}`,
            actorId: user.id, createdAt: day(invoice.date!, 8) } });
          exits++;
        }
        await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: {
          currentStock: { increment: line.quantity }, pricePerUnit: line.unitPrice,
          minThreshold: stock(line.quantity * 0.2), lastDelivery: day(invoice.date!, 12),
        } });
        await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: line.quantity,
          reason: "invoice_import_demo", operationId: `source-receipt:${invoice.id}`,
          actorId: user.id, createdAt: day(invoice.date!, 12) } });
      }
      await tx.workspaceDocument.create({ data: { restaurantId, kind, data: invoice as unknown as Prisma.InputJsonValue } });
      return { imported: true, receipts: lines.length, exits };
    });
    if (result.imported) imported++;
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
      const used = stock(available * fraction);
      if (used <= 0) return;
      await tx.product.update({ where: { restaurantId_id: { restaurantId, id } }, data: { currentStock: { decrement: used } } });
      await tx.stockMovement.create({ data: { restaurantId, productId: id, delta: -used,
        reason: "simulated_consumption", operationId, actorId: user.id,
        createdAt: latest ? day(latest, 18) : new Date() } });
      simulatedExits++;
    });
  }
  console.info(JSON.stringify({ account: email, sourceInvoices: invoices.length, imported, stockReceipts: receipts,
    simulatedExits, unquantifiedOrExcluded: invoices.filter((invoice) => !invoice.stockLines.length).length }));
} finally {
  await prisma.$disconnect();
}
