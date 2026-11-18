import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { simulationActor } from "./operationProvenance.js";
import { findRecipeVersionForDate } from "./recipeVersionStorage.js";
import { WorkspaceError } from "./workspaceError.js";
import type { WorkshopOperationsInput } from "./workshopOperationsInput.js";

const preparationKey = (slot: string, name: string) => `${slot}\0${name}`;
const lossMovementKey = (date: string, reference: string) => `workshop-stock:v1:${date}:${reference}:loss`;
const quantity = (milli: number) => new Prisma.Decimal(milli).div(1000);

export async function applyWorkshopKitchen(tx: Prisma.TransactionClient, restaurantId: string, date: string,
  { services, losses }: WorkshopOperationsInput) {
  const serviceDate = new Date(`${date}T00:00:00.000Z`);
  const recipeNames = new Set(services.flatMap(service => service.items.map(item => item.name)));
  const [recipes, products, movements] = await Promise.all([
    tx.recipe.findMany({ where: { restaurantId, name: { in: [...recipeNames] } }, select: { id: true, name: true } }),
    tx.product.findMany({ where: { restaurantId, name: { in: losses.flatMap(loss => loss.product ? [loss.product] : []) } },
      select: { id: true, name: true, unit: true } }),
    tx.stockMovement.findMany({ where: { restaurantId, reason: "simulation_loss", wasteRecord: null,
      operationId: { in: losses.flatMap(loss => loss.kind === "raw" && loss.lotReference ? [lossMovementKey(date, loss.lotReference)] : []) } },
      select: { id: true, operationId: true, productId: true, productUnitSnapshot: true, delta: true,
        lotAllocations: { select: { lotId: true, quantity: true } } } }),
  ]);

  const recipeByName = new Map<string, { id: string; versionId: string | null }>();
  for (const name of recipeNames) {
    const matches = recipes.filter(recipe => recipe.name === name);
    if (matches.length !== 1) throw new WorkspaceError(409, "WORKSHOP_KITCHEN_RECIPE", `La recette « ${name} » est manquante ou ambiguë.`);
    const [{ id }] = matches;
    const version = await findRecipeVersionForDate(tx, restaurantId, id, serviceDate);
    recipeByName.set(name, { id, versionId: version?.effectiveFrom ? version.id : null });
  }

  const preparationIds = new Map<string, string>();
  const productions: Prisma.ProductionCreateManyInput[] = [];
  for (const { slot, items } of services) for (const item of items) {
    const recipe = recipeByName.get(item.name)!;
    const base = { restaurantId, recipeId: recipe.id, recipeName: item.name, recipeVersionId: recipe.versionId,
      date: serviceDate, serviceSlot: slot, actorId: simulationActor, prepTime: item.prepTime, notes: "" };
    const operationId = `workshop-kitchen:v1:${date}:${slot}:${recipe.id}`;
    if (item.prepared) {
      const id = randomUUID();
      preparationIds.set(preparationKey(slot, item.name), id);
      productions.push({ ...base, id, kind: "production", portions: item.prepared, operationId: `${operationId}:prepared` });
    }
    if (item.refused) productions.push({ ...base, kind: "refusal", portions: item.refused, operationId: `${operationId}:refused` });
  }

  const linkedMovements = new Set<string>();
  const wastes: Prisma.WasteRecordCreateManyInput[] = losses.map((loss, index) => {
    const matches = products.filter(product => product.name === loss.product && product.unit === loss.unit);
    if (loss.product && matches.length !== 1)
      throw new WorkspaceError(409, "WORKSHOP_KITCHEN_PRODUCT", `Le produit « ${loss.product} » ou son unité ne correspond pas au stock.`);
    const productId = matches[0]?.id ?? null;
    const productionId = loss.recipe && loss.slot ? preparationIds.get(preparationKey(loss.slot, loss.recipe)) ?? null : null;
    if (loss.kind !== "raw" && !productionId)
      throw new WorkspaceError(400, "WORKSHOP_KITCHEN_PREPARATION", "Une perte est associée à une préparation absente du service.");
    const amount = quantity(loss.quantityMilli);
    const movementKey = loss.kind === "raw" && loss.lotReference ? lossMovementKey(date, loss.lotReference) : null;
    const movement = movementKey
      ? movements.find(row => row.operationId === movementKey && row.productId === productId &&
        row.productUnitSnapshot === loss.unit && row.delta.eq(amount.negated()) && row.lotAllocations.length === 1 &&
        row.lotAllocations[0].quantity.eq(amount) && !linkedMovements.has(row.id)) : undefined;
    if (movement) linkedMovements.add(movement.id);
    return { restaurantId, serviceDate, actorId: simulationActor, operationId: `workshop-kitchen:v1:${date}:loss:${index}`,
      serviceSlot: loss.slot, kind: loss.kind, productId, productionId, lotId: movement?.lotAllocations[0].lotId ?? null,
      stockMovementId: movement?.id ?? null, quantity: amount, unit: loss.unit, note: loss.note,
      avoidability: loss.avoidable ? "avoidable" : "inedible" };
  });

  await tx.production.createMany({ data: productions });
  await tx.wasteRecord.createMany({ data: wastes });
}
