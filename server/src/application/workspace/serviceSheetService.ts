import { isDeepStrictEqual } from "node:util";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";
import { WorkspaceError } from "./catalogService.js";
import { getServiceMenu } from "./serviceMenuService.js";
import { getOperationalForecast } from "./operationalForecastService.js";
import { reconcileServiceSheet, serviceSheetClosureErrors, type SheetEvidence } from "./serviceSheetPolicy.js";
import { qualifiedAllocation, type ServiceSlot } from "../../../../shared/serviceCalendar.js";
import type { MenuEntry, SheetInput } from "../../../../shared/serviceOperations.js";
import type { ServiceSheet } from "../../../../shared/serviceSheet.js";
import { weatherContextForDecision } from "./serviceWeatherService.js";

type Database = PrismaClient | Prisma.TransactionClient;
type StoredSheet = Omit<ServiceSheet, "serviceDate" | "slot" | "revision" | "facts" | "factsChangedSinceClosure">;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const kind = (serviceDate: string, slot: ServiceSlot) => `service-sheet:${serviceDate}:${slot}`;
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const empty = (): StoredSheet => ({ state: "draft", planned: [], outcomes: [], substitutions: [], note: "", menuEntries: [], menuRevision: 0,
  validatedAt: null, validatedBy: null, closedAt: null, closedBy: null, closureFacts: null,
  forecastKey: null, forecastReference: null });

async function evidence(restaurantId: string, serviceDate: string, slot: ServiceSlot, menuEntries: MenuEntry[], menuRevision: number, db: Database): Promise<SheetEvidence> {
  const serviceDay = date(serviceDate);
  const [productions, sales, wastes, session, recipes, restaurant, refunds] = await Promise.all([
    db.production.findMany({ where: { restaurantId, date: serviceDay, kind: { in: ["production", "refusal"] } }, orderBy: { id: "asc" } }),
    db.dailySale.findMany({ where: { restaurantId, serviceDate: serviceDay, source: { not: "demo_simulation" } }, include: { serviceAllocation: true } }),
    db.wasteRecord.findMany({ where: { restaurantId, serviceDate: serviceDay }, orderBy: { id: "asc" } }),
    db.restaurantServiceSession.findUnique({ where: { restaurantId_serviceDate_slot: { restaurantId, serviceDate: serviceDay, slot } } }),
    db.recipe.findMany({ where: { restaurantId }, select: { id: true, name: true } }),
    db.restaurant.findUniqueOrThrow({ where: { id: restaurantId }, select: { mode: true } }),
    db.saleContributionEvent.findMany({ where: { restaurantId, kind: "refund_recorded",
      snapshot: { path: ["serviceDate"], equals: serviceDate }, contribution: { source: { not: "demo_simulation" } } },
      include: { contribution: { select: { sourceItemName: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
  ]);
  const qualified = sales.map(sale => ({ sale, assignment: qualifiedAllocation(sale, sale.serviceAllocation) }));
  const actualProductions = productions.filter(production => production.serviceSlot === slot && production.kind === "production");
  const actualWaste = wastes.filter(waste => waste.serviceSlot === slot);
  const productionIds = new Set(actualProductions.map(production => production.id));
  const additionalGaps = [];
  if (restaurant.mode === "demo") additionalGaps.push("Les données hors bilan ne constituent pas des observations opérationnelles.");
  if (wastes.some(waste => !waste.serviceSlot && waste.productionId)) additionalGaps.push("Des pertes de préparation de la journée restent non ventilées.");
  if (actualWaste.some(waste => waste.productionId && !productionIds.has(waste.productionId)))
    additionalGaps.push("Des pertes concernent une préparation d’un autre service ou d’une autre date : rapprochez les reports conservés séparément.");
  return { menuEntries, menuRevision, recipeNames: Object.fromEntries([...recipes.map(recipe => [recipe.id, recipe.name]),
    ...menuEntries.flatMap(entry => entry.components.map(component => [component.recipeId, component.recipeName]))]),
    productions: actualProductions, refusals: productions.filter(production => production.serviceSlot === slot && production.kind === "refusal"),
    unallocatedRefusals: productions.filter(production => !production.serviceSlot && production.kind === "refusal").reduce((sum, production) => sum + production.portions, 0),
    sales: qualified.flatMap(({ sale, assignment }) => {
      const quantity = slot === "lunch" ? assignment.lunchQuantity : assignment.dinnerQuantity;
      return quantity > 0 ? [{ id: sale.id, saleItemId: sale.saleItemId, quantity, revision: sale.revision,
        allocationRevision: sale.serviceAllocation?.revision ?? 0 }] : [];
    }), wastes: actualWaste.map(waste => ({ id: waste.id, productionId: waste.productionId, kind: waste.kind, quantity: Number(waste.quantity), unit: waste.unit })),
    coverage: session?.coverage ?? "missing", additionalGaps,
    unallocatedSales: qualified.reduce((sum, row) => sum + row.assignment.unallocatedQuantity, 0),
    unallocatedProductions: productions.filter(production => !production.serviceSlot && production.kind === "production").length,
    staleAllocations: qualified.filter(row => row.assignment.needsReview).length,
    dailyRefunds: refunds.map(refund => {
      const snapshot = refund.snapshot as { saleId?: string; saleItemName?: string };
      return { id: refund.id, saleId: snapshot.saleId ?? null, serviceDate, serviceSlot: null,
        saleItemName: snapshot.saleItemName ?? refund.contribution.sourceItemName, recordedAt: refund.createdAt.toISOString(), reason: refund.reason, amount: null };
    }) };
}

export async function getServiceSheet(restaurantId: string, serviceDate: string, slot: ServiceSlot, db: Database = prisma): Promise<ServiceSheet> {
  const document = await db.workspaceDocument.findUnique({ where: { restaurantId_kind: { restaurantId, kind: kind(serviceDate, slot) } } });
  const stored = document ? document.data as unknown as StoredSheet : empty();
  const menu = stored.state === "draft" ? await getServiceMenu(restaurantId, serviceDate, slot, db) : null;
  const menuEntries = menu?.entries ?? stored.menuEntries, menuRevision = menu?.revision ?? stored.menuRevision;
  const facts = reconcileServiceSheet(stored, await evidence(restaurantId, serviceDate, slot, menuEntries, menuRevision, db));
  return { ...stored, serviceDate, slot, revision: document?.revision ?? 0, menuEntries, menuRevision, facts,
    factsChangedSinceClosure: stored.closureFacts !== null && !isDeepStrictEqual(stored.closureFacts, facts) };
}

export async function saveServiceSheet(restaurantId: string, actorId: string, input: SheetInput): Promise<ServiceSheet> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`);
    const replay = await tx.recommendationDecision.findFirst({ where: { restaurantId, operationId: input.operationId, decision: "service_sheet_saved" } });
    if (replay) {
      const snapshot = replay.snapshot as unknown as { input: SheetInput; result: ServiceSheet };
      if (!isDeepStrictEqual(snapshot.input, input)) throw new WorkspaceError(409, "OPERATION_CONFLICT", "Cette validation a déjà été utilisée pour une autre fiche.");
      return snapshot.result;
    }
    const current = await getServiceSheet(restaurantId, input.serviceDate, input.slot, tx);
    if (current.revision !== input.expectedRevision) throw new WorkspaceError(409, "REVISION_CONFLICT", "La fiche a changé. Rechargez-la.");
    if (current.state === "closed") throw new WorkspaceError(409, "SERVICE_ALREADY_CLOSED", "La clôture est conservée. Les corrections ultérieures restent visibles dans le rapprochement.");
    if (input.action === "close" && current.state !== "validated")
      throw new WorkspaceError(409, "PLAN_REVIEW_REQUIRED", "Le chef doit valider le plan avant de clôturer le service.");
    const ids = [...new Set([...input.planned.map(row => row.recipeId), ...input.outcomes.map(row => row.recipeId),
      ...input.substitutions.flatMap(row => [row.fromRecipeId, row.toRecipeId])])];
    if (await tx.recipe.count({ where: { restaurantId, id: { in: ids } } }) !== ids.length)
      throw new WorkspaceError(400, "INVALID_RECIPE", "Une recette est absente du restaurant.");
    if (current.state === "validated" && !isDeepStrictEqual(current.planned, input.planned))
      throw new WorkspaceError(409, "VALIDATED_PLAN_CHANGED", "Le plan validé est conservé. Enregistrez les compléments en production et les substitutions explicitement.");
    if (current.state === "validated" && (current.forecastKey ?? null) !== (input.forecastKey ?? null))
      throw new WorkspaceError(409, "VALIDATED_PLAN_CHANGED", "La provenance du plan validé doit être conservée.");
    let forecastReference = current.forecastReference;
    if (current.state === "draft" && input.forecastKey &&
        (input.action === "validate_plan" || current.forecastReference?.forecastKey !== input.forecastKey)) {
      const forecast = await getOperationalForecast(restaurantId, input.serviceDate, input.serviceDate, tx);
      const reference = forecast.services.find(service => service.slot === input.slot);
      if (!reference || reference.forecastKey !== input.forecastKey)
        throw new WorkspaceError(409, "FORECAST_CHANGED", "Les estimations ont changé. Rechargez-les puis revoyez le plan avant validation.");
      if (reference.blockers.length || reference.items.some(item => item.quantity === null))
        throw new WorkspaceError(409, "FORECAST_NOT_READY", "Les estimations sont incomplètes. Utilisez un plan manuel clairement identifié ou complétez les données.");
      forecastReference = reference;
    }
    const facts = reconcileServiceSheet(input, await evidence(restaurantId, input.serviceDate, input.slot, current.menuEntries, current.menuRevision, tx));
    if (facts.lines.some(line => line.adjustedPlanned < 0)) throw new WorkspaceError(400, "INVALID_SUBSTITUTION", "Les substitutions dépassent les portions prévues.");
    if (input.action === "close") {
      const errors = serviceSheetClosureErrors(facts);
      if (errors.length) throw new WorkspaceError(409, "SERVICE_RECONCILIATION_REQUIRED", errors.join(" "));
    }
    const timestamp = new Date().toISOString();
    const weatherContext = input.action === "validate_plan" && current.state === "draft"
      ? await weatherContextForDecision(tx, restaurantId, input.serviceDate, input.slot, input.weatherContextRef)
      : current.weatherContext;
    const next: StoredSheet = { state: input.action === "close" ? "closed" : input.action === "validate_plan" ? "validated" : current.state,
      planned: input.planned, outcomes: input.outcomes, substitutions: input.substitutions, note: input.note,
      menuEntries: current.menuEntries, menuRevision: current.menuRevision,
      validatedAt: input.action === "validate_plan" ? timestamp : current.validatedAt,
      validatedBy: input.action === "validate_plan" ? actorId : current.validatedBy,
      closedAt: input.action === "close" ? timestamp : null, closedBy: input.action === "close" ? actorId : null,
      closureFacts: input.action === "close" ? facts : null, forecastKey: input.forecastKey ?? null,
      forecastReference: input.forecastKey ? forecastReference : null,
      ...(weatherContext ? { weatherContext } : {}) };
    const result: ServiceSheet = { ...next, serviceDate: input.serviceDate, slot: input.slot,
      revision: current.revision + 1, facts, factsChangedSinceClosure: false };
    await tx.workspaceDocument.upsert({ where: { restaurantId_kind: { restaurantId, kind: kind(input.serviceDate, input.slot) } },
      create: { restaurantId, kind: kind(input.serviceDate, input.slot), revision: result.revision, data: json(next) },
      update: { revision: result.revision, data: json(next) } });
    await tx.recommendationDecision.create({ data: { restaurantId, actorId, operationId: input.operationId,
      decision: "service_sheet_saved", snapshot: json({ input, result }) } });
    return result;
  });
}
