import { sourceInvoiceDocumentSchema } from "../application/workspace/invoiceData.js";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { readSourceInvoices } from "./sourceInvoices.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";

const write = process.argv.includes("--write");
const database = new URL(env.DATABASE_URL);

if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Import refusé : la cible doit être une base PostgreSQL locale de démonstration.");
}

try {
  const invoices = readSourceInvoices().map(invoice => {
    const parsed = sourceInvoiceDocumentSchema.safeParse(invoice);
    if (!parsed.success) {
      const fields = new Set(parsed.error.issues.map(issue => issue.path.join(".")));
      throw new Error(`Fiche source invalide : ${invoice.file} (${[...fields].join(", ")}).`);
    }
    return { kind: `source-invoice:${invoice.id}`, data: { ...parsed.data, file: invoice.file } };
  });
  const { restaurantId } = await resolveCamilleRestaurantId();
  const existing = await prisma.workspaceDocument.findMany({
    where: { restaurantId, kind: { in: invoices.map(invoice => invoice.kind) } },
    select: { kind: true, data: true },
  });
  const byKind = new Map(existing.map(document => [document.kind, document]));
  const missing = invoices.filter(invoice => {
    const prior = byKind.get(invoice.kind);
    if (!prior) return true;
    const data = prior.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || data.contentHash !== invoice.data.contentHash) {
      throw new Error(`Fiche modifiée depuis l’import : ${invoice.data.file}`);
    }
    return false;
  });

  if (write && missing.length > 0) {
    await prisma.workspaceDocument.createMany({ data: missing.map(invoice => ({ restaurantId, ...invoice })) });
  }

  console.info(JSON.stringify({
    target: "La Pizzeria de Camille",
    sourceDocuments: invoices.length,
    wouldCreateOrCreated: missing.length,
    unchanged: invoices.length - missing.length,
    mode: write ? "write" : "dry-run",
    sideEffects: "documents only; no products, receipts or consumption",
  }));
} finally {
  await prisma.$disconnect();
}
