import { Prisma, type RecommendationDecision, type RecipeVersion, type ServiceDay } from "@prisma/client";
import { isSimulationReceipt, isSimulationSale, isSimulationServiceDay, simulationActor } from "./operationProvenance.js";
import { isSimulationStockMovement, stockReceiptProvenance } from "./stockMovementProvenance.js";

type TimelineProvenance = "source" | "recorded" | "simulation" | "assumption" | "unknown";
type TimelineKind = "document" | "stock" | "loss" | "recipe" | "mapping" | "production" | "sale" | "service" |
  "decision" | "purchase_order" | "purchase_receipt";

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

export interface TimelineDocumentRow {
  kind: string;
  knownAt: Date;
  sourceDate: string | null;
  title: string | null;
  supplier: string | null;
  documentType: string | null;
  status: string | null;
  provenance: string | null;
  stockEffect: string | null;
  lineCount: number;
}

type StockMovementRow = Prisma.StockMovementGetPayload<{ include: { purchaseReceiptLine: typeof stockReceiptProvenance } }>;
type WasteRow = Prisma.WasteRecordGetPayload<{ include: { product: { select: { name: true } }; production: { select: { recipeName: true; actorId: true } } } }>;
type RecipeVersionRow = RecipeVersion;
type ProductionRow = Prisma.ProductionGetPayload<{ include: { recipeVersion: {
  select: { version: true; effectiveFrom: true };
} } }>;
type PurchaseOrderRow = Prisma.PurchaseOrderGetPayload<{ include: { lines: true } }>;
type PurchaseReceiptRow = Prisma.PurchaseReceiptGetPayload<{ include: {
  supplier: { select: { name: true } }; lines: true;
} }>;
type DecisionRow = RecommendationDecision;

type SaleRow = Prisma.DailySaleGetPayload<{ include: {
  saleItem: { select: { name: true } }; serviceDay: { select: { source: true } };
} }>;
type MappingRow = Prisma.SaleItemRecipeMappingGetPayload<{ include: { saleItem: { select: { name: true } } } }>;
const recipeCandidateDecisionLabels: Record<string, string> = {
  recipe_candidate_created: "Fiche de recette candidate créée",
  recipe_candidate_saved: "Fiche de recette candidate corrigée",
  recipe_candidate_confirmed: "Fiche de recette candidate confirmée",
  recipe_candidate_rejected: "Fiche de recette candidate écartée",
};
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const quantity = (value: Prisma.Decimal) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const safeText = (value: string, max = 120) => [...value]
  .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
  .join("").trim().slice(0, max);

export function wasteEvent(row: WasteRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  const labels: Record<string, string> = { raw: "Perte de matière brute", preparation: "Perte de préparation",
    unsold: "Invendu", plate_return: "Retour d’assiette" };
  const item = row.product?.name ?? row.production?.recipeName;
  return { id: `waste:${row.id}`, kind: "loss", effectiveAt: isoDate(row.serviceDate), knownAt: row.createdAt.toISOString(),
    recordedAt: row.createdAt.toISOString(), label: labels[row.kind] ?? "Perte déclarée",
    detail: [item && safeText(item), `${quantity(row.quantity)} ${safeText(row.unit, 24)}`, safeText(row.note)].filter(Boolean).join(" · "),
    provenance: workspaceMode === "demo" || row.actorId === simulationActor || row.production?.actorId === simulationActor ? "simulation" : "recorded" };
}

export function documentEvent(row: TimelineDocumentRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  const archivedSource = row.kind.startsWith("source-invoice:");
  const effectiveAt = row.sourceDate && /^\d{4}-\d{2}-\d{2}$/.test(row.sourceDate) ? row.sourceDate : null;
  const simulated = workspaceMode === "demo" || row.provenance === "demo_simulation" || row.stockEffect === "demo_simulation";
  const provenance: TimelineProvenance = !effectiveAt ? "unknown"
    : archivedSource ? "source" : simulated ? "simulation" : "recorded";
  const archiveConfirmed = row.kind.startsWith("invoice:source:") &&
    row.status === "received" && row.stockEffect === "none";
  const details = [row.title || (archivedSource ? "Pièce d’archive" : "Document d’achat"), row.supplier,
    row.documentType, row.status, `${Math.max(0, row.lineCount)} ligne(s) transcrite(s)`]
    .filter(Boolean).map((value) => safeText(value!, 120)).join(" · ");
  return {
    id: `document:${row.kind}`, kind: "document", effectiveAt,
    knownAt: row.knownAt.toISOString(), recordedAt: row.knownAt.toISOString(),
    label: archivedSource ? "Pièce source d’archive" : archiveConfirmed ? "Pièce d’archive confirmée" : "Document d’achat enregistré",
    detail: details, provenance,
    qualifier: `La date affichée est la dernière mise à jour disponible ; la première saisie n’est pas historisée.${archivedSource
      ? " Transcription d’archive : elle n’est pas une preuve de livraison." : ""}${archiveConfirmed
      ? " Confirmation documentaire uniquement, hors bilan des livraisons." : ""}${!effectiveAt ? " Date d’effet inconnue." : ""}`,
    ...(archivedSource ? { href: `/orders?source=${encodeURIComponent(row.kind.slice("source-invoice:".length))}#invoices` } : {}),
  };
}

export function stockEvent(movement: StockMovementRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const simulation = isSimulationStockMovement(movement, workspaceMode);
  const assumed = ["simulation_opening", "simulation_restock", "simulation_loss"].includes(movement.reason);
  const reviewedArchive = movement.reason === "invoice_import_demo" && movement.invoiceDocumentId !== null &&
    movement.invoiceRevision !== null;
  const labels: Record<string, string> = {
    simulation_opening: "Stock de départ à vérifier",
    invoice_import_demo: reviewedArchive ? "Crédit de stock d’archive validé" : "Entrée issue d’une transcription",
    simulated_consumption: "Sortie de référence",
    simulated_unit_rounding: "Ajustement de référence",
    simulation_restock: "Réassort à vérifier",
    production: "Matières consommées pour une production",
    simulation_loss: "Perte à vérifier",
    loss: "Perte enregistrée",
    receipt: "Réception enregistrée",
    initial: "Stock initial enregistré",
    adjustment: "Ajustement de stock enregistré",
    simulation_stock_adjustment: "Écart d’inventaire à vérifier",
    stock_count: "Écart d’inventaire enregistré",
  };
  const isLoss = movement.reason === "loss" || movement.reason === "simulation_loss";
  const productName = movement.productNameSnapshot ? safeText(movement.productNameSnapshot) : "Libellé produit non archivé";
  const unit = movement.productUnitSnapshot ? safeText(movement.productUnitSnapshot, 24) : "unité inconnue";
  const direction = movement.delta.greaterThan(0) ? "+" : "";
  const supplier = movement.supplierNameSnapshot ? ` · fournisseur : ${safeText(movement.supplierNameSnapshot)}` : "";
  const sourceId = movement.sourceDocumentId ?? movement.operationId.match(/^restaurant-simulation-v1:invoice:([^:]+):/)?.[1];
  const source = movement.reason === "invoice_import_demo" && sourceId
    ? ` · pièce source ${safeText(sourceId, 32)}` : "";
  const qualifiers = [
    !movement.productNameSnapshot ? "Le nom historique du produit est inconnu." : "",
    assumed ? "Mouvement de référence à confirmer." : "",
    workspaceMode === "demo" && movement.reason === "stock_count" ? "Comptage à vérifier avant de le retenir comme inventaire." : "",
    simulation && !assumed && !["stock_count", "loss", "invoice_import_demo"].includes(movement.reason) ?
      "Opération non retenue dans l’activité enregistrée." : "",
    workspaceMode !== "demo" && simulation && movement.reason === "stock_count" ? "Comptage non retenu comme inventaire confirmé." : "",
    simulation && movement.reason === "loss" ? "Perte non rapprochée des opérations enregistrées." : "",
    reviewedArchive ? "Crédit appliqué au stock de travail et exclu du bilan des livraisons."
      : movement.reason === "invoice_import_demo" ? "Entrée de référence issue d’une transcription, hors bilan des livraisons." : "",
  ].filter(Boolean);
  return {
    id: `stock:${movement.id}`, kind: isLoss ? "loss" : "stock",
    effectiveAt: movement.createdAt.toISOString(), knownAt: movement.createdAt.toISOString(),
    recordedAt: movement.createdAt.toISOString(), label: movement.reason === "stock_count" && movement.delta.greaterThan(0)
      ? "Surstock compté" : labels[movement.reason] ?? "Mouvement de stock enregistré",
    detail: `${productName} · ${direction}${quantity(movement.delta)} ${unit}${supplier}${source}`,
    provenance: assumed ? "assumption" : simulation ? "simulation" : "recorded",
    ...(qualifiers.length ? { qualifier: qualifiers.join(" ") } : {}),
    href: `/stocks?product=${encodeURIComponent(movement.productId)}`,
  };
}

export function productionEvent(production: ProductionRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const simulated = workspaceMode === "demo" || production.actorId === simulationActor;
  const demo = workspaceMode === "demo";
  return {
    id: `production:${production.id}`, kind: "production", effectiveAt: isoDate(production.date),
    knownAt: production.createdAt.toISOString(), recordedAt: production.createdAt.toISOString(),
    label: production.kind === "refusal" ? "Production refusée"
      : demo ? "Production déclarée" : "Production enregistrée",
    detail: `${safeText(production.recipeName)} · ${production.kind === "refusal"
      ? `${production.portions} portion(s) demandée(s), aucune sortie de stock`
      : `${production.portions} portion(s) préparée(s)`}${production.recipeVersion
      ? ` · recette v${production.recipeVersion.version}${production.recipeVersion.effectiveFrom
        ? ` (effet ${isoDate(production.recipeVersion.effectiveFrom)})` : " (effet inconnu)"}` : " · version non liée"}`,
    provenance: simulated ? "simulation" : "recorded",
    ...(demo ? { qualifier: "Déclaration à vérifier avant de la retenir comme production enregistrée." }
      : production.actorId === simulationActor ? { qualifier: "Production non rapprochée des opérations enregistrées." } : {}),
    href: "/recipes",
  };
}

export function versionEvent(version: RecipeVersionRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const unknownDate = !version.effectiveFrom;
  const simulated = workspaceMode === "demo" || version.actorId === simulationActor;
  const qualifier = workspaceMode === "demo"
    ? "Version à confirmer comme recette pratiquée."
    : "Version de recette à confirmer.";
  return {
    id: `recipe:${version.id}`, kind: "recipe", effectiveAt: version.effectiveFrom ? isoDate(version.effectiveFrom) : null,
    knownAt: version.createdAt.toISOString(), recordedAt: version.createdAt.toISOString(),
    label: `Version ${version.version} de recette`,
    detail: `${safeText(version.name)} · rendement ${version.yieldPortions} portion(s)`,
    provenance: unknownDate ? "unknown" : simulated ? "simulation" : "recorded",
    ...(unknownDate ? { qualifier: `Date d’effet inconnue${simulated ? " ; version à confirmer" : ""}.` }
      : simulated ? { qualifier } : {}),
    href: "/recipes",
  };
}

export function purchaseOrderEvent(order: PurchaseOrderRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  const simulated = workspaceMode === "demo" || order.status.startsWith("simulated");
  const lines = order.lines.slice(0, 3).map((line) =>
    `${safeText(line.productName)} · ${quantity(line.quantity)} ${safeText(line.unit, 24)}`);
  if (order.lines.length > lines.length) lines.push(`${order.lines.length - 3} autre(s) ligne(s)`);
  const allSuppliers = [...new Set(order.lines.map((line) => safeText(line.supplierName)))];
  const suppliers = allSuppliers.slice(0, 3);
  if (allSuppliers.length > suppliers.length) suppliers.push("autres");
  return {
    id: `purchase-order:${order.id}`, kind: "purchase_order", effectiveAt: order.createdAt.toISOString(),
    knownAt: order.createdAt.toISOString(), recordedAt: order.createdAt.toISOString(),
    label: simulated ? "Commande préparée" : "Commande interne créée",
    detail: `${lines.join(" · ")} · fournisseur(s) : ${suppliers.join(", ") || "inconnu"}`,
    provenance: simulated ? "simulation" : "recorded",
    qualifier: simulated ? "Commande non transmise au fournisseur." :
      "La validation enregistre la décision ; aucune transmission fournisseur n’est effectuée.",
    href: "/orders#to-transmit",
  };
}

export function purchaseReceiptEvent(receipt: PurchaseReceiptRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  const lines = receipt.lines.filter((line) => line.receivedQuantity.greaterThan(0));
  const detailLines = lines.slice(0, 3).map((line) =>
    `${safeText(line.productName)} · ${quantity(line.receivedQuantity)} ${safeText(line.unit, 24)}`);
  if (lines.length > detailLines.length) detailLines.push(`${lines.length - 3} autre(s) ligne(s)`);
  const simulated = isSimulationReceipt(receipt, workspaceMode);
  const source = receipt.sourceDocumentId ? ` · pièce source ${safeText(receipt.sourceDocumentId, 32)}` : "";
  return {
    id: `purchase-receipt:${receipt.id}`, kind: "purchase_receipt", effectiveAt: isoDate(receipt.deliveryDate),
    knownAt: receipt.createdAt.toISOString(), recordedAt: receipt.createdAt.toISOString(),
    label: "Réception rapprochée",
    detail: `${detailLines.join(" · ")} · fournisseur : ${safeText(receipt.supplier.name)}${source}`,
    provenance: simulated ? "simulation" : "recorded",
    qualifier: receipt.simulated ? "Cette réception n’a pas modifié le stock enregistré et reste hors bilan."
      : simulated ? "Quantité exclue du bilan des livraisons." :
      "Quantité rapprochée à la livraison et ajoutée au stock enregistré.",
    href: receipt.sourceDocumentId ? `/orders?source=${encodeURIComponent(receipt.sourceDocumentId)}#invoices` : "/orders",
  };
}

export function saleEvent(sale: SaleRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  const simulated = isSimulationSale(sale, workspaceMode);
  return {
    id: `sale:${sale.id}`, kind: "sale", effectiveAt: isoDate(sale.serviceDate),
    knownAt: sale.updatedAt.toISOString(), recordedAt: sale.createdAt.toISOString(),
    label: simulated ? "Vente à vérifier" : "Vente enregistrée",
    detail: `${safeText(sale.saleItem.name)} · ${sale.quantity} article(s)`,
    provenance: simulated ? "simulation" : "recorded",
    ...(simulated ? { qualifier: "Cette vente est hors bilan." } : {}),
    href: "/sales",
  };
}

export function serviceEvent(day: ServiceDay, workspaceMode: "operational" | "demo"): TimelineEvent {
  const simulated = isSimulationServiceDay(day, workspaceMode);
  return {
    id: `service:${isoDate(day.serviceDate)}`, kind: "service",
    effectiveAt: isoDate(day.serviceDate), knownAt: day.updatedAt.toISOString(), recordedAt: day.createdAt.toISOString(),
    label: `Service ${day.status === "closed" ? "clôturé" : "ouvert"}`,
    detail: `Couverture ${day.coverage} · origine ${simulated ? "hors bilan" : day.source}`,
    provenance: simulated ? "simulation" : "recorded",
    ...(day.coverage !== "complete" ? { qualifier: "État partiel ou manquant ; les ventes disponibles ne décrivent pas un service complet." }
      : simulated ? { qualifier: "Cet état de service est hors bilan et ne complète pas le calendrier enregistré." } : {}),
    href: "/sales",
  };
}

export function mappingEvent(mapping: MappingRow, workspaceMode: "operational" | "demo"): TimelineEvent {
  return {
    id: `mapping:${mapping.id}`, kind: "mapping", effectiveAt: isoDate(mapping.effectiveFrom),
    knownAt: mapping.createdAt.toISOString(), recordedAt: mapping.createdAt.toISOString(),
    label: "Correspondance article ↔ recette confirmée",
    detail: `${safeText(mapping.saleItem.name)} → ${safeText(mapping.recipeName)} · ${quantity(mapping.portionsPerItem)} portion(s)/article · révision ${mapping.revision}`,
    provenance: workspaceMode === "demo" || mapping.actorId === simulationActor ? "simulation" : "recorded",
    href: "/sales",
  };
}

export function decisionEvent(decision: DecisionRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const snapshot = decision.snapshot && typeof decision.snapshot === "object" && !Array.isArray(decision.snapshot)
    ? decision.snapshot as Prisma.JsonObject : null;
  const suggestion = snapshot?.suggestion && typeof snapshot.suggestion === "object" && !Array.isArray(snapshot.suggestion)
    ? snapshot.suggestion as Prisma.JsonObject : null;
  const candidate = snapshot?.result && typeof snapshot.result === "object" && !Array.isArray(snapshot.result)
    ? snapshot.result as Prisma.JsonObject : null;
  const candidateRecipe = candidate?.recipe && typeof candidate.recipe === "object" && !Array.isArray(candidate.recipe)
    ? candidate.recipe as Prisma.JsonObject : null;
  const receiptSource = snapshot?.source && typeof snapshot.source === "object" && !Array.isArray(snapshot.source)
    ? snapshot.source as Prisma.JsonObject : null;
  const createdRecipe = snapshot?.recipe && typeof snapshot.recipe === "object" && !Array.isArray(snapshot.recipe)
    ? snapshot.recipe as Prisma.JsonObject : null;
  const candidateDecisionLabel = recipeCandidateDecisionLabels[decision.decision];
  const isRecipeCandidateDecision = candidateDecisionLabel !== undefined;
  const isReceiptLinkedRecipe = decision.decision === "recipe_created_from_receipt_estimate";
  const candidateName = typeof candidateRecipe?.name === "string" ? safeText(candidateRecipe.name) : "";
  const candidateStatus = typeof candidate?.status === "string" ? safeText(candidate.status) : "";
  const createdRecipeName = typeof createdRecipe?.name === "string" ? safeText(createdRecipe.name) : "";
  const receiptProductName = typeof receiptSource?.productName === "string" ? safeText(receiptSource.productName) : "";
  const receiptReference = typeof receiptSource?.reference === "string" ? safeText(receiptSource.reference) : "";
  const receiptSourceLabel = typeof receiptSource?.stockMovementId === "string" ? "facture" : "livraison";
  const receiptQuantity = typeof receiptSource?.receivedQuantity === "number"
    ? receiptSource.receivedQuantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "";
  const receiptUnit = typeof receiptSource?.unit === "string" ? safeText(receiptSource.unit, 24) : "";
  const simulated = workspaceMode === "demo" || decision.actorId === simulationActor || isRecipeCandidateDecision ||
    snapshot?.workspaceMode === "demo" || snapshot?.provenance === "demo_simulation" ||
    decision.decision.includes("simulated") || suggestion?.provenance === "demo_simulation";
  const productName = typeof suggestion?.productName === "string" ? safeText(suggestion.productName) : "";
  const quantityValue = typeof snapshot?.quantity === "number" ? snapshot.quantity : null;
  const detail = isRecipeCandidateDecision
    ? `${candidateName ? `« ${candidateName} »` : "Fiche candidate"}${candidateStatus ? ` · état : ${candidateStatus}` : ""}`
    : isReceiptLinkedRecipe
      ? `${createdRecipeName ? `« ${createdRecipeName} »` : "Recette"}${receiptProductName ? ` · ${receiptProductName}` : ""}` +
        `${receiptReference ? ` · ${receiptSourceLabel} ${receiptReference}` : ""}${receiptQuantity ? ` · ${receiptQuantity} ${receiptUnit}` : ""}`
    : decision.decision.startsWith("purchase_suggestion_") && productName
      ? `${productName}${quantityValue === null ? "" : ` · quantité retenue ${quantityValue.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}`}`
      : "La décision est conservée séparément des recommandations actuelles.";
  return {
    id: `decision:${decision.id}`, kind: "decision", effectiveAt: decision.createdAt.toISOString(),
    knownAt: decision.createdAt.toISOString(), recordedAt: decision.createdAt.toISOString(),
    label: candidateDecisionLabel ?? (isReceiptLinkedRecipe ? "Recette créée après revue d’une entrée reçue"
      : `Décision enregistrée : ${safeText(decision.decision, 80)}`), detail,
    provenance: simulated ? "simulation" : "recorded",
    ...(isRecipeCandidateDecision
      ? { qualifier: `${candidateStatus === "confirmed" ? "Fiche de recette confirmée"
        : candidateStatus === "rejected" ? "Proposition de recette écartée"
          : "Proposition de recette à valider"} ; aucune cuisson n’est déclarée.` }
      : isReceiptLinkedRecipe ? { qualifier: "La recette a été créée après revue de la réception ; aucune vente, perte ou sortie de stock n’est enregistrée." }
      : simulated ? { qualifier: "Décision liée à des éléments hors bilan ; elle ne vaut pas un achat confirmé." } : {}),
    href: isRecipeCandidateDecision || isReceiptLinkedRecipe ? "/recipes"
      : decision.decision.startsWith("purchase_suggestion_") || decision.decision.startsWith("order_")
        ? "/orders#selection" : "/predictions",
  };
}
