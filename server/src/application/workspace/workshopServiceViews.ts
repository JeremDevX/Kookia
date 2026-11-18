import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { serviceSlots } from "../../../../shared/serviceCalendar.js";
import type { MenuEntry } from "../../../../shared/serviceOperations.js";
import { simulationActor } from "./operationProvenance.js";
import { WorkspaceError } from "./workspaceError.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";

const normalize = (name: string) => name.toLocaleLowerCase("fr-FR");
const sourceNote = "Service simulé par l’atelier documentaire.";

export async function applyWorkshopServiceViews(tx: Prisma.TransactionClient, restaurantId: string, serviceDate: Date,
  operations: WorkshopOperationsInput, operationId: string) {
  const day = { restaurantId, serviceDate };
  const [sessions, menus, sales, recipes] = await Promise.all([
    tx.restaurantServiceSession.count({ where: day }),
    tx.serviceMenuVersion.count({ where: day }),
    tx.dailySale.findMany({ where: day, include: { saleItem: true, serviceAllocation: true } }),
    tx.recipeVersion.findMany({ where: { restaurantId, effectiveFrom: { lte: serviceDate },
      name: { in: operations.services.flatMap(service => service.items.map(item => item.name)) } },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }], include: { ingredients: true } }),
  ]);
  if (sessions || menus || sales.some(sale => sale.serviceAllocation || sale.revision !== 0 || sale.source !== "demo_simulation")) {
    throw new WorkspaceError(409, "WORKSHOP_SERVICE_CONFLICT", "Une carte, une ventilation ou un service est déjà renseigné à cette date.");
  }

  const services = new Map(operations.services.map(service => [service.slot, service]));
  const note = [sourceNote, ...operations.events].join(" ").slice(0, 1000);
  await tx.restaurantServiceSession.createMany({ data: serviceSlots.map(slot => ({ ...day, slot,
    plannedOpen: services.has(slot), coverage: "complete", actualCovers: services.get(slot)?.covers ?? 0,
    note: slot === (operations.services[0]?.slot ?? "lunch") ? note : sourceNote, actorId: simulationActor })) });
  await tx.saleServiceAllocation.createMany({ data: sales.map(sale => {
    const units = (slot: "lunch" | "dinner") => services.get(slot)?.items.find(item => normalize(item.name) === sale.saleItem.normalizedName)?.sold ?? 0;
    const [lunchQuantity, dinnerQuantity] = [units("lunch"), units("dinner")];
    if (sale.quantity !== lunchQuantity + dinnerQuantity) {
      throw new WorkspaceError(409, "WORKSHOP_SERVICE_CONFLICT", "Les ventes existantes diffèrent de la ventilation de l’atelier.");
    }
    return { restaurantId, saleId: sale.id, saleRevision: sale.revision, lunchQuantity, dinnerQuantity, actorId: simulationActor };
  }) });

  const versionByName = new Map([...recipes].reverse().map(recipe => [recipe.name, recipe]));
  for (const service of operations.services) {
    const entries: MenuEntry[] = [];
    for (const item of service.items) {
      const recipe = versionByName.get(item.name);
      if (!recipe || recipe.category !== item.category) continue;
      entries.push({ id: randomUUID(), name: item.name, category: item.category, available: true, priceCents: item.priceCents,
        saleItemId: sales.find(sale => sale.saleItem.normalizedName === normalize(item.name))?.saleItemId ?? null,
        components: [{ recipeId: recipe.recipeId, portions: 1, recipeName: recipe.name, recipeVersionId: recipe.id,
          recipeVersion: recipe.version, category: recipe.category, yieldPortions: recipe.yieldPortions,
          ingredients: recipe.ingredients.map(ingredient => ({ productId: ingredient.productId, productName: ingredient.productName,
            unit: ingredient.productUnit, quantity: Number(ingredient.quantity) })) }] });
    }
    // Use a complete dated menu or leave the menu available in the source dossier.
    if (entries.length && entries.length === service.items.length) await tx.serviceMenuVersion.create({ data: {
      ...day, slot: service.slot, operationId: `${operationId}:menu:${service.slot}`, actorId: simulationActor,
      revision: 1, note: sourceNote, entries: entries as unknown as Prisma.InputJsonValue,
    } });
  }
}
