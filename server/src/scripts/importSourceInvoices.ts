import { Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infrastructure/database/prisma.js";
import { readSourceInvoices } from "./sourceInvoices.js";
import { resolveCamilleRestaurantId } from "./restaurantSimulationTarget.js";

const write = process.argv.includes("--write");
const database = new URL(env.DATABASE_URL);

if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(database.hostname) || database.pathname !== "/kookia") {
  throw new Error("Import refusé : la cible doit être une base PostgreSQL locale de démonstration.");
}

const invoices = readSourceInvoices();

try {
  const { restaurantId } = await resolveCamilleRestaurantId();
  let created = 0;
  let unchanged = 0;

  for (const invoice of invoices) {
    const kind = `source-invoice:${invoice.id}`;
    const existing = await prisma.workspaceDocument.findUnique({
      where: { restaurantId_kind: { restaurantId, kind } },
      select: { data: true },
    });
    if (existing) {
      const contentHash = (existing.data as { contentHash?: string }).contentHash;
      if (contentHash !== invoice.contentHash) throw new Error(`Fiche modifiée depuis l’import : ${invoice.file}`);
      unchanged++;
      continue;
    }
    if (!write) {
      created++;
      continue;
    }
    await prisma.workspaceDocument.create({
      data: { restaurantId, kind, data: invoice as unknown as Prisma.InputJsonValue },
    });
    created++;
  }

  console.info(JSON.stringify({
    target: "La Pizzeria de Camille",
    sourceDocuments: invoices.length,
    wouldCreateOrCreated: created,
    unchanged,
    mode: write ? "write" : "dry-run",
    sideEffects: "documents only; no products, receipts or consumption",
  }));
} finally {
  await prisma.$disconnect();
}
