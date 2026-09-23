import { prisma } from "../infrastructure/database/prisma.js";

const TARGET_RESTAURANT_NAME = "La Pizzeria de Camille";

export async function resolveCamilleRestaurantId() {
  const candidates = await prisma.restaurant.findMany({ where: { name: TARGET_RESTAURANT_NAME }, select: { id: true } });
  const fingerprints = await Promise.all(candidates.map(async ({ id }) => {
    const [sourceDocuments, legacyProducts, legacyMovements] = await Promise.all([
      prisma.workspaceDocument.count({ where: { restaurantId: id, kind: { startsWith: "source-invoice:" } } }),
      prisma.product.count({ where: { restaurantId: id, id: { startsWith: "invoice-product-" } } }),
      prisma.stockMovement.count({ where: { restaurantId: id,
        reason: { in: ["invoice_import_demo", "simulated_consumption", "simulated_unit_rounding"] } } }),
    ]);
    return { id, sourceDocuments, legacyProducts, legacyMovements };
  }));
  const matches = fingerprints.filter((row) => row.sourceDocuments === 431 || (row.legacyProducts > 0 && row.legacyMovements > 0));
  if (matches.length !== 1) throw new Error("Espace local Camille non déterminable de façon unique par ses données source.");
  return { restaurantId: matches[0].id, fingerprint: matches[0] };
}
