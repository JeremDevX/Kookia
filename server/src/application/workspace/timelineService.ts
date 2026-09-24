import { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/database/prisma.js";

export type TimelineProvenance = "source" | "recorded" | "simulation" | "assumption" | "unknown";
export type TimelineKind = "document" | "stock" | "loss" | "recipe" | "mapping" | "production" | "sale" | "service" | "decision";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  effectiveAt: string | null;
  knownAt: string | null;
  recordedAt: string | null;
  label: string;
  detail: string;
  provenance: TimelineProvenance;
  qualifier?: string;
  href?: string;
}

const QUERY_LIMIT = 1_501;
const RESPONSE_LIMIT = 5_000;
const SIMULATION_ACTOR = "restaurant-simulation:v1";
const isoDate = (value: Date) => value.toISOString().slice(0, 10);

function parisMidnight(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, day);
  const local = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(utcMidnight));
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(local.find((item) => item.type === type)?.value);
  const localAsUtc = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return new Date(utcMidnight - (localAsUtc - utcMidnight));
}

function addDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function timelineDateBounds(from: string, to: string, asOf: string) {
  return {
    start: parisMidnight(from),
    end: parisMidnight(addDay(to)),
    dateStart: new Date(`${from}T00:00:00.000Z`),
    dateEnd: new Date(`${to}T00:00:00.000Z`),
    knownThrough: new Date(parisMidnight(addDay(asOf)).getTime() - 1),
  };
}

const quantity = (value: Prisma.Decimal) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const safeText = (value: string, max = 120) => [...value]
  .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
  .join("").trim().slice(0, max);

interface SourceDocumentRow {
  kind: string;
  knownAt: Date;
  sourceDate: string | null;
  title: string | null;
  supplier: string | null;
  documentType: string | null;
  status: string | null;
  provenance: string | null;
  lineCount: number;
}

async function listDocumentEvents(restaurantId: string, from: string, to: string, knownThrough: Date) {
  // Select only safe metadata; transcription content and stock-line payloads never enter the application.
  return prisma.$queryRaw<SourceDocumentRow[]>(Prisma.sql`
    SELECT kind,
      "updatedAt" AS "knownAt",
      data ->> 'date' AS "sourceDate",
      LEFT(COALESCE(data ->> 'title', data ->> 'sourceTitle', ''), 120) AS title,
      LEFT(COALESCE(data ->> 'supplier', data ->> 'sourceSupplier', ''), 120) AS supplier,
      LEFT(COALESCE(data ->> 'type', data ->> 'sourceType', ''), 60) AS "documentType",
      LEFT(COALESCE(data ->> 'status', data ->> 'sourceStatus', ''), 60) AS status,
      LEFT(COALESCE(data ->> 'provenance', ''), 40) AS provenance,
      CASE WHEN jsonb_typeof(data -> 'stockLines') = 'array' THEN jsonb_array_length(data -> 'stockLines')
        WHEN data ->> 'sourceLineCount' ~ '^[0-9]{1,6}$' THEN (data ->> 'sourceLineCount')::integer
        ELSE 0 END AS "lineCount"
    FROM "WorkspaceDocument"
    WHERE "restaurantId" = ${restaurantId}
      AND (kind LIKE 'source-invoice:%' OR kind LIKE 'invoice:%')
      AND (data ->> 'date' IS NULL OR (data ->> 'date' >= ${from} AND data ->> 'date' <= ${to}))
      AND "updatedAt" <= ${knownThrough}
    ORDER BY data ->> 'date' ASC NULLS LAST, kind ASC
    LIMIT ${QUERY_LIMIT}
  `);
}

function documentEvent(row: SourceDocumentRow): TimelineEvent {
  const archivedSource = row.kind.startsWith("source-invoice:");
  const effectiveAt = row.sourceDate && /^\d{4}-\d{2}-\d{2}$/.test(row.sourceDate) ? row.sourceDate : null;
  const provenance: TimelineProvenance = !effectiveAt ? "unknown"
    : archivedSource ? "source" : row.provenance === "demo_simulation" ? "simulation" : "recorded";
  const details = [row.title || (archivedSource ? "Pièce d’archive" : "Document d’achat"), row.supplier,
    row.documentType, row.status, `${Math.max(0, row.lineCount)} ligne(s) transcrite(s)`]
    .filter(Boolean).map((value) => safeText(value!, 120)).join(" · ");
  return {
    id: `document:${row.kind}`,
    kind: "document",
    effectiveAt,
    knownAt: row.knownAt.toISOString(),
    recordedAt: row.knownAt.toISOString(),
    label: archivedSource ? "Pièce source d’archive" : "Document d’achat enregistré",
    detail: details,
    provenance,
    qualifier: `La date affichée est la dernière mise à jour disponible ; la première saisie n’est pas historisée.${archivedSource
      ? " Transcription d’archive : elle n’est pas une preuve de livraison." : ""}${!effectiveAt ? " Date d’effet inconnue." : ""}`,
  };
}

function stockEvent(movement: Awaited<ReturnType<typeof prisma.stockMovement.findMany>>[number]): TimelineEvent {
  const simulation = movement.actorId === SIMULATION_ACTOR;
  const assumed = ["simulation_opening", "simulation_restock", "simulation_loss"].includes(movement.reason);
  const labels: Record<string, string> = {
    simulation_opening: "Stock d’ouverture fictif",
    invoice_import_demo: "Réception simulée depuis une pièce source",
    simulation_restock: "Réassort synthétique",
    production: "Matières consommées pour une production",
    simulation_loss: "Perte invendue estimée",
    loss: "Perte enregistrée",
    receipt: "Réception enregistrée",
    initial: "Stock initial enregistré",
    adjustment: "Ajustement de stock enregistré",
    stock_count: "Écart d’inventaire enregistré",
  };
  const isLoss = movement.reason === "loss" || movement.reason === "simulation_loss";
  const productName = movement.productNameSnapshot ? safeText(movement.productNameSnapshot) : "Libellé produit non archivé";
  const unit = movement.productUnitSnapshot ? safeText(movement.productUnitSnapshot, 24) : "unité inconnue";
  const direction = movement.delta.greaterThan(0) ? "+" : "";
  const supplier = movement.supplierNameSnapshot ? ` · fournisseur : ${safeText(movement.supplierNameSnapshot)}` : "";
  const qualifiers = [
    !movement.productNameSnapshot ? "Le nom historique du produit est inconnu." : "",
    assumed ? "Hypothèse du scénario, non observée." : "",
    movement.reason === "invoice_import_demo" ? "Crédit de stock simulé ; la transcription source n’est pas une livraison vérifiée." : "",
  ].filter(Boolean);
  return {
    id: `stock:${movement.id}`,
    kind: isLoss ? "loss" : "stock",
    effectiveAt: movement.createdAt.toISOString(),
    knownAt: movement.createdAt.toISOString(),
    recordedAt: movement.createdAt.toISOString(),
    label: labels[movement.reason] ?? "Mouvement de stock enregistré",
    detail: `${productName} · ${direction}${quantity(movement.delta)} ${unit}${supplier}`,
    provenance: assumed ? "assumption" : simulation ? "simulation" : "recorded",
    ...(qualifiers.length ? { qualifier: qualifiers.join(" ") } : {}),
    href: `/stocks?product=${encodeURIComponent(movement.productId)}`,
  };
}

function versionEvent(version: Awaited<ReturnType<typeof prisma.recipeVersion.findMany>>[number]): TimelineEvent {
  const unknownDate = !version.effectiveFrom;
  const simulated = version.actorId === SIMULATION_ACTOR;
  return {
    id: `recipe:${version.id}`,
    kind: "recipe",
    effectiveAt: version.effectiveFrom ? isoDate(version.effectiveFrom) : null,
    knownAt: version.createdAt.toISOString(),
    recordedAt: version.createdAt.toISOString(),
    label: `Version ${version.version} de recette`,
    detail: `${safeText(version.name)} · rendement ${version.yieldPortions} portion(s)`,
    provenance: unknownDate ? "unknown" : simulated ? "simulation" : "recorded",
    ...(unknownDate ? { qualifier: `Date d’effet inconnue${simulated ? " ; version issue de la simulation" : ""}.` }
      : simulated ? { qualifier: "Instantané de recette simulé." } : {}),
    href: "/recipes",
  };
}

export async function listTimeline(restaurantId: string, from: string, to: string, asOf: string) {
  const bounds = timelineDateBounds(from, to, asOf);
  const dateRange = { gte: bounds.dateStart, lte: bounds.dateEnd };
  const [movements, productions, sales, serviceDays, recipeVersions, mappings, decisions, documents] = await Promise.all([
    prisma.stockMovement.findMany({ where: { restaurantId, createdAt: { gte: bounds.start, lt: bounds.end, lte: bounds.knownThrough } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    prisma.production.findMany({ where: { restaurantId, date: dateRange, createdAt: { lte: bounds.knownThrough } },
      include: { recipeVersion: { select: { version: true, effectiveFrom: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    prisma.dailySale.findMany({ where: { restaurantId, serviceDate: dateRange, updatedAt: { lte: bounds.knownThrough } },
      include: { saleItem: { select: { name: true } } }, orderBy: [{ serviceDate: "asc" }, { createdAt: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    prisma.serviceDay.findMany({ where: { restaurantId, serviceDate: dateRange, updatedAt: { lte: bounds.knownThrough } },
      orderBy: [{ serviceDate: "asc" }], take: QUERY_LIMIT }),
    prisma.recipeVersion.findMany({ where: { restaurantId, createdAt: { lte: bounds.knownThrough }, OR: [
      { effectiveFrom: dateRange }, { effectiveFrom: null },
    ] }, orderBy: [{ effectiveFrom: "asc" }, { createdAt: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    prisma.saleItemRecipeMapping.findMany({ where: { restaurantId, effectiveFrom: dateRange, createdAt: { lte: bounds.knownThrough } },
      include: { saleItem: { select: { name: true } } }, orderBy: [{ effectiveFrom: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    prisma.recommendationDecision.findMany({ where: { restaurantId,
      createdAt: { gte: bounds.start, lt: bounds.end, lte: bounds.knownThrough } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: QUERY_LIMIT }),
    listDocumentEvents(restaurantId, from, to, bounds.knownThrough),
  ]);

  const events: TimelineEvent[] = [
    ...documents.map(documentEvent),
    ...movements.map(stockEvent),
    ...productions.map((production): TimelineEvent => ({
      id: `production:${production.id}`, kind: "production", effectiveAt: isoDate(production.date),
      knownAt: production.createdAt.toISOString(), recordedAt: production.createdAt.toISOString(),
      label: production.kind === "refusal" ? "Production refusée" : "Production enregistrée",
      detail: `${safeText(production.recipeName)} · ${production.portions} portion(s préparée(s)${production.recipeVersion
        ? ` · recette v${production.recipeVersion.version}${production.recipeVersion.effectiveFrom
          ? ` (effet ${isoDate(production.recipeVersion.effectiveFrom)})` : " (effet inconnu)"}` : " · version non liée"}`,
      provenance: production.actorId === SIMULATION_ACTOR ? "simulation" : "recorded",
      ...(production.actorId === SIMULATION_ACTOR ? { qualifier: "Production de démonstration, non observée." } : {}),
      href: "/recipes",
    })),
    ...sales.map((sale): TimelineEvent => ({
      id: `sale:${sale.id}`, kind: "sale", effectiveAt: isoDate(sale.serviceDate),
      knownAt: sale.updatedAt.toISOString(), recordedAt: sale.createdAt.toISOString(),
      label: "Vente enregistrée", detail: `${safeText(sale.saleItem.name)} · ${sale.quantity} article(s)`,
      provenance: sale.source === "demo_simulation" ? "simulation" : "recorded",
      ...(sale.source === "demo_simulation" ? { qualifier: "Vente synthétique de démonstration." } : {}),
      href: "/sales",
    })),
    ...serviceDays.map((day): TimelineEvent => ({
      id: `service:${day.serviceDate.toISOString().slice(0, 10)}`, kind: "service",
      effectiveAt: isoDate(day.serviceDate), knownAt: day.updatedAt.toISOString(), recordedAt: day.createdAt.toISOString(),
      label: `Service ${day.status === "closed" ? "clôturé" : "ouvert"}`,
      detail: `Couverture ${day.coverage} · origine ${day.source}`,
      provenance: day.source === "demo_simulation" ? "simulation" : "recorded",
      ...(day.coverage !== "complete" ? { qualifier: "État partiel ou manquant ; les ventes disponibles ne décrivent pas un service complet." }
        : day.source === "demo_simulation" ? { qualifier: "État de service synthétique." } : {}),
      href: "/sales",
    })),
    ...recipeVersions.map(versionEvent),
    ...mappings.map((mapping): TimelineEvent => ({
      id: `mapping:${mapping.id}`, kind: "mapping", effectiveAt: isoDate(mapping.effectiveFrom),
      knownAt: mapping.createdAt.toISOString(), recordedAt: mapping.createdAt.toISOString(),
      label: "Correspondance article ↔ recette confirmée",
      detail: `${safeText(mapping.saleItem.name)} → ${safeText(mapping.recipeName)} · ${quantity(mapping.portionsPerItem)} portion(s)/article · révision ${mapping.revision}`,
      provenance: mapping.actorId === SIMULATION_ACTOR ? "simulation" : "recorded",
      href: "/sales",
    })),
    ...decisions.map((decision): TimelineEvent => ({
      id: `decision:${decision.id}`, kind: "decision", effectiveAt: decision.createdAt.toISOString(),
      knownAt: decision.createdAt.toISOString(), recordedAt: decision.createdAt.toISOString(),
      label: `Décision enregistrée : ${safeText(decision.decision, 80)}`,
      detail: "La décision est conservée séparément des recommandations actuelles.",
      provenance: "recorded", href: "/predictions",
    })),
  ];
  events.sort((a, b) => (a.effectiveAt ?? "9999-12-31").localeCompare(b.effectiveAt ?? "9999-12-31") || a.id.localeCompare(b.id));
  const truncated = events.length > RESPONSE_LIMIT || [movements, productions, sales, serviceDays, recipeVersions, mappings, decisions, documents]
    .some((rows) => rows.length === QUERY_LIMIT);
  return { from, to, asOf, count: Math.min(events.length, RESPONSE_LIMIT), truncated,
    events: events.slice(0, RESPONSE_LIMIT) };
}
