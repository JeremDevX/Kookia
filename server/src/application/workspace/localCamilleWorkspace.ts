import { prisma } from "../../infrastructure/database/prisma.js";

export const localCamilleRestaurantName = "La Pizzeria de Camille";

export async function findLocalCamilleRestaurant() {
  const candidates = await prisma.restaurant.findMany({ where: { name: localCamilleRestaurantName }, select: { id: true } });
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
  return matches.length === 1 ? { restaurantId: matches[0].id, fingerprint: matches[0] } : null;
}
