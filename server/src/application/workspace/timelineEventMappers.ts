import { Prisma, type RecommendationDecision, type RecipeVersion, type StockMovement } from "@prisma/client";

export type TimelineProvenance = "source" | "recorded" | "simulation" | "assumption" | "unknown";
export type TimelineKind = "document" | "stock" | "loss" | "recipe" | "mapping" | "production" | "sale" | "service" |
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
  lineCount: number;
}

type StockMovementRow = StockMovement;
type RecipeVersionRow = RecipeVersion;
type ProductionRow = Prisma.ProductionGetPayload<{ include: { recipeVersion: {
  select: { version: true; effectiveFrom: true };
} } }>;
type PurchaseOrderRow = Prisma.PurchaseOrderGetPayload<{ include: { lines: true } }>;
type PurchaseReceiptRow = Prisma.PurchaseReceiptGetPayload<{ include: {
  supplier: { select: { name: true } }; lines: true;
} }>;
type DecisionRow = RecommendationDecision;

const SIMULATION_ACTOR = "restaurant-simulation:v1";
const recipeCandidateDecisionLabels: Record<string, string> = {
  recipe_candidate_created: "Hypothèse de recette créée dans le bac de démonstration",
  recipe_candidate_saved: "Hypothèse de recette corrigée dans le bac de démonstration",
  recipe_candidate_confirmed: "Candidate confirmée comme recette dans le bac de démonstration",
  recipe_candidate_rejected: "Candidate écartée dans le bac de démonstration",
};
const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const quantity = (value: Prisma.Decimal) => Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 3 });
const safeText = (value: string, max = 120) => [...value]
  .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
  .join("").trim().slice(0, max);

export function documentEvent(row: TimelineDocumentRow): TimelineEvent {
  const archivedSource = row.kind.startsWith("source-invoice:");
  const effectiveAt = row.sourceDate && /^\d{4}-\d{2}-\d{2}$/.test(row.sourceDate) ? row.sourceDate : null;
  const provenance: TimelineProvenance = !effectiveAt ? "unknown"
    : archivedSource ? "source" : row.provenance === "demo_simulation" ? "simulation" : "recorded";
  const details = [row.title || (archivedSource ? "Pièce d’archive" : "Document d’achat"), row.supplier,
    row.documentType, row.status, `${Math.max(0, row.lineCount)} ligne(s) transcrite(s)`]
    .filter(Boolean).map((value) => safeText(value!, 120)).join(" · ");
  return {
    id: `document:${row.kind}`, kind: "document", effectiveAt,
    knownAt: row.knownAt.toISOString(), recordedAt: row.knownAt.toISOString(),
    label: archivedSource ? "Pièce source d’archive" : "Document d’achat enregistré",
    detail: details, provenance,
    qualifier: `La date affichée est la dernière mise à jour disponible ; la première saisie n’est pas historisée.${archivedSource
      ? " Transcription d’archive : elle n’est pas une preuve de livraison." : ""}${!effectiveAt ? " Date d’effet inconnue." : ""}`,
    ...(archivedSource ? { href: `/orders?source=${encodeURIComponent(row.kind.slice("source-invoice:".length))}#invoices` } : {}),
  };
}

export function stockEvent(movement: StockMovementRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const simulation = workspaceMode === "demo" || movement.actorId === SIMULATION_ACTOR;
  const assumed = ["simulation_opening", "simulation_restock", "simulation_loss"].includes(movement.reason);
  const labels: Record<string, string> = {
    simulation_opening: "Stock d’ouverture fictif",
    invoice_import_demo: "Réception simulée depuis une pièce source",
    simulation_restock: "Réassort synthétique",
    production: "Matières consommées pour une production",
    simulation_loss: "Perte invendue estimée",
    loss: simulation ? "Perte enregistrée — scénario simulé" : "Perte enregistrée",
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
  const sourceId = movement.sourceDocumentId ?? movement.operationId.match(/^restaurant-simulation-v1:invoice:([^:]+):/)?.[1];
  const source = movement.reason === "invoice_import_demo" && sourceId
    ? ` · pièce source ${safeText(sourceId, 32)}` : "";
  const qualifiers = [
    !movement.productNameSnapshot ? "Le nom historique du produit est inconnu." : "",
    assumed ? "Hypothèse du scénario, non observée." : "",
    workspaceMode === "demo" && movement.reason === "stock_count" ? "Comptage simulé dans le bac de démonstration, non observé." : "",
    workspaceMode === "demo" && movement.reason !== "stock_count" ? "Mouvement du bac de démonstration ; il ne constitue pas un stock réel." : "",
    workspaceMode !== "demo" && simulation && movement.reason === "stock_count" ? "Comptage du scénario simulé, non observé." : "",
    simulation && movement.reason === "loss" ? "Perte explicite du scénario, synthétique et non observée." : "",
    movement.reason === "invoice_import_demo" ? "Crédit de stock simulé ; la transcription source n’est pas une livraison vérifiée." : "",
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
  const simulated = workspaceMode === "demo" || production.actorId === SIMULATION_ACTOR;
  const demo = workspaceMode === "demo";
  return {
    id: `production:${production.id}`, kind: "production", effectiveAt: isoDate(production.date),
    knownAt: production.createdAt.toISOString(), recordedAt: production.createdAt.toISOString(),
    label: production.kind === "refusal" ? (demo ? "Production refusée (démo)" : "Production refusée")
      : demo ? "Production déclarée (démo)" : "Production enregistrée",
    detail: `${safeText(production.recipeName)} · ${production.kind === "refusal"
      ? `${production.portions} portion(s) demandée(s), aucune sortie de stock`
      : `${production.portions} portion(s) préparée(s)`}${production.recipeVersion
      ? ` · recette v${production.recipeVersion.version}${production.recipeVersion.effectiveFrom
        ? ` (effet ${isoDate(production.recipeVersion.effectiveFrom)})` : " (effet inconnu)"}` : " · version non liée"}`,
    provenance: simulated ? "simulation" : "recorded",
    ...(demo ? { qualifier: "Déclaration du bac de démonstration ; elle n’atteste pas une production réelle." }
      : production.actorId === SIMULATION_ACTOR ? { qualifier: "Production de démonstration, non observée." } : {}),
    href: "/recipes",
  };
}

export function versionEvent(version: RecipeVersionRow, workspaceMode: "operational" | "demo" = "operational"): TimelineEvent {
  const unknownDate = !version.effectiveFrom;
  const simulated = workspaceMode === "demo" || version.actorId === SIMULATION_ACTOR;
  const qualifier = workspaceMode === "demo"
    ? "Version du bac de démonstration ; elle n’atteste pas une recette réellement pratiquée."
    : "Instantané de recette simulé.";
  return {
    id: `recipe:${version.id}`, kind: "recipe", effectiveAt: version.effectiveFrom ? isoDate(version.effectiveFrom) : null,
    knownAt: version.createdAt.toISOString(), recordedAt: version.createdAt.toISOString(),
    label: `Version ${version.version} de recette`,
    detail: `${safeText(version.name)} · rendement ${version.yieldPortions} portion(s)`,
    provenance: unknownDate ? "unknown" : simulated ? "simulation" : "recorded",
    ...(unknownDate ? { qualifier: `Date d’effet inconnue${simulated ? " ; version issue de la simulation" : ""}.` }
      : simulated ? { qualifier } : {}),
    href: "/recipes",
  };
}

export function purchaseOrderEvent(order: PurchaseOrderRow): TimelineEvent {
  const simulated = order.status.startsWith("simulated");
  const lines = order.lines.slice(0, 3).map((line) =>
    `${safeText(line.productName)} · ${quantity(line.quantity)} ${safeText(line.unit, 24)}`);
  if (order.lines.length > lines.length) lines.push(`${order.lines.length - 3} autre(s) ligne(s)`);
  const allSuppliers = [...new Set(order.lines.map((line) => safeText(line.supplierName)))];
  const suppliers = allSuppliers.slice(0, 3);
  if (allSuppliers.length > suppliers.length) suppliers.push("autres");
  return {
    id: `purchase-order:${order.id}`, kind: "purchase_order", effectiveAt: order.createdAt.toISOString(),
    knownAt: order.createdAt.toISOString(), recordedAt: order.createdAt.toISOString(),
    label: simulated ? "Commande simulée créée" : "Commande interne créée",
    detail: `${lines.join(" · ")} · fournisseur(s) : ${suppliers.join(", ") || "inconnu"}`,
    provenance: simulated ? "simulation" : "recorded",
    qualifier: simulated ? "Simulation uniquement : commande non transmise au fournisseur." :
      "La validation enregistre la décision ; aucune transmission fournisseur n’est effectuée.",
    href: "/orders#to-transmit",
  };
}

export function purchaseReceiptEvent(receipt: PurchaseReceiptRow): TimelineEvent {
  const lines = receipt.lines.filter((line) => line.receivedQuantity.greaterThan(0));
  const detailLines = lines.slice(0, 3).map((line) =>
    `${safeText(line.productName)} · ${quantity(line.receivedQuantity)} ${safeText(line.unit, 24)}`);
  if (lines.length > detailLines.length) detailLines.push(`${lines.length - 3} autre(s) ligne(s)`);
  const simulated = receipt.simulated || receipt.provenance === "demo_simulation";
  const source = receipt.sourceDocumentId ? ` · pièce source ${safeText(receipt.sourceDocumentId, 32)}` : "";
  return {
    id: `purchase-receipt:${receipt.id}`, kind: "purchase_receipt", effectiveAt: isoDate(receipt.deliveryDate),
    knownAt: receipt.createdAt.toISOString(), recordedAt: receipt.createdAt.toISOString(),
    label: simulated ? "Réception simulée rapprochée" : "Réception rapprochée",
    detail: `${detailLines.join(" · ")} · fournisseur : ${safeText(receipt.supplier.name)}${source}`,
    provenance: simulated ? "simulation" : "recorded",
    qualifier: simulated ? "Quantité déclarée dans le scénario ; aucun stock réel n’a été modifié." :
      "Quantité rapprochée à la livraison et ajoutée au stock enregistré.",
    href: receipt.sourceDocumentId ? `/orders?source=${encodeURIComponent(receipt.sourceDocumentId)}#invoices` : "/orders",
  };
}

export function decisionEvent(decision: DecisionRow): TimelineEvent {
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
  const receiptQuantity = typeof receiptSource?.receivedQuantity === "number"
    ? receiptSource.receivedQuantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 }) : "";
  const receiptUnit = typeof receiptSource?.unit === "string" ? safeText(receiptSource.unit, 24) : "";
  const simulated = isRecipeCandidateDecision || snapshot?.workspaceMode === "demo" || snapshot?.provenance === "demo_simulation" ||
    decision.decision.includes("simulated") || suggestion?.provenance === "demo_simulation";
  const productName = typeof suggestion?.productName === "string" ? safeText(suggestion.productName) : "";
  const quantityValue = typeof snapshot?.quantity === "number" ? snapshot.quantity : null;
  const detail = isRecipeCandidateDecision
    ? `${candidateName ? `« ${candidateName} »` : "Fiche candidate"}${candidateStatus ? ` · état : ${candidateStatus}` : ""}`
    : isReceiptLinkedRecipe
      ? `${createdRecipeName ? `« ${createdRecipeName} »` : "Recette"}${receiptProductName ? ` · ${receiptProductName}` : ""}` +
        `${receiptReference ? ` · livraison ${receiptReference}` : ""}${receiptQuantity ? ` · ${receiptQuantity} ${receiptUnit}` : ""}`
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
      ? { qualifier: "Hypothèse de recette du bac de démonstration ; aucune cuisson n’est déclarée." }
      : isReceiptLinkedRecipe ? { qualifier: "La recette a été créée après revue de la réception ; aucune vente, perte ou sortie de stock n’est enregistrée." }
      : simulated ? { qualifier: "Décision liée à des données ou à un espace simulé ; elle ne vaut pas achat réel." } : {}),
    href: isRecipeCandidateDecision || isReceiptLinkedRecipe ? "/recipes"
      : decision.decision.startsWith("purchase_suggestion_") || decision.decision.startsWith("order_")
        ? "/orders#selection" : "/predictions",
  };
}
