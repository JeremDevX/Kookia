import { Prisma } from "@prisma/client";
import { addCalendarDays } from "../../../../shared/calendarDate.js";
import { readDeclaredWaste, summarizeDeclaredWaste } from "./declaredWasteRead.js";
import { wasteKindLabels } from "../../../../shared/declaredWaste.js";
import { prisma } from "../../infrastructure/database/prisma.js";
import { simulationActor } from "./operationProvenance.js";
import { isSimulationStockMovement, stockReceiptProvenance } from "./stockMovementProvenance.js";
import { legacyLossCost, lossMovementReasons } from "./legacyLossValuation.js";

interface OperationalReportRow {
  section: string; date: string; metric: string; value: string | number; source: string;
}

interface DeclaredLossSummary {
  method: string; dateBasis: string; reportedMovementCount: number; unpricedMovementCount: number;
  incompatibleUnitMovementCount: number; excludedSimulationMovementCount: number;
  unavailableMetrics: ["stockouts", "complete_unsold_quantity"];
}

export async function getOperationalReport(restaurantId: string, from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${addCalendarDays(to, 1)}T00:00:00Z`);
  const range = { gte: start, lt: end };
  const operationalScope = { restaurantId, restaurant: { mode: "operational" as const } };
  const [workspace, sales, movements, productions, orders, typedRows] = await prisma.$transaction([
    prisma.restaurant.findUnique({ where: { id: restaurantId }, select: { mode: true } }),
    prisma.dailySale.findMany({ where: { ...operationalScope, serviceDate: range,
      source: { not: "demo_simulation" }, serviceDay: { source: { not: "demo_simulation" } },
    }, select: { serviceDate: true, quantity: true, source: true, revision: true,
      saleItem: { select: { name: true } } }, orderBy: { serviceDate: "asc" } }),
    prisma.stockMovement.findMany({ where: { restaurantId, wasteRecord: null, createdAt: range }, include: {
      product: { select: { name: true, unit: true } },
      purchaseReceiptLine: stockReceiptProvenance,
    }, orderBy: { createdAt: "asc" } }),
    prisma.production.findMany({ where: { ...operationalScope, date: range, actorId: { not: simulationActor } },
      select: { date: true, recipeName: true, kind: true, portions: true }, orderBy: { date: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { ...operationalScope, createdAt: range, NOT: { status: { startsWith: "simulated" } } },
      select: { createdAt: true, lines: { select: { productName: true, quantity: true, unit: true, pricePerUnit: true } } },
      orderBy: { createdAt: "asc" } }),
    readDeclaredWaste(prisma, restaurantId, start, end),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const mode = workspace?.mode ?? "operational";
  const declaredWaste = summarizeDeclaredWaste(typedRows, from, to, mode);
  const rows: OperationalReportRow[] = [];
  const declaredLosses: DeclaredLossSummary = {
    method: "Mouvements de stock négatifs déclarés comme pertes. Les anciens mouvements utilisent le prix enregistré lors de la perte. Les déclarations par service utilisent le coût des lots connus. Les montants gardent leur précision par ligne. Les déchets liés à une préparation ne donnent lieu à aucune nouvelle déduction ni extrapolation de coût. Aucun calcul à partir des ventes, des productions ou des seuils.",
    dateBasis: "Les déclarations par service suivent le jour du service (Europe/Paris). Les anciens mouvements suivent leur date d’enregistrement (UTC). Les deux dates sélectionnées sont incluses.",
    reportedMovementCount: 0, unpricedMovementCount: 0, incompatibleUnitMovementCount: 0,
    excludedSimulationMovementCount: typedRows.filter((row) => row.stockMovement && isSimulationStockMovement(row.stockMovement, mode)).length, unavailableMetrics: ["stockouts", "complete_unsold_quantity"],
  };

  for (const movement of movements) {
    const explicitLoss = movement.delta.isNegative() && lossMovementReasons.includes(movement.reason);
    const simulated = isSimulationStockMovement(movement, mode);
    if (explicitLoss && simulated) declaredLosses.excludedSimulationMovementCount++;
    if (simulated) continue;

    if (explicitLoss) {
      const unit = movement.productUnitSnapshot ?? movement.product.unit;
      const quantity = movement.delta.abs();
      const operation = `Opération source ${movement.operationId}`;
      if (unit !== movement.product.unit) {
        declaredLosses.incompatibleUnitMovementCount++;
        rows.push({ section: "Pertes à vérifier", date: movement.createdAt.toISOString(),
          metric: `${movement.productNameSnapshot ?? movement.product.name} — unité enregistrée ${unit}, unité actuelle ${movement.product.unit}`,
          value: Number(quantity), source: `${operation} · exclue du total des pertes tant que l’unité n’est pas rapprochée` });
        continue;
      }

      declaredLosses.reportedMovementCount++;
      const knownCost = legacyLossCost(quantity, movement.unitPriceSnapshot);
      if (knownCost === null) declaredLosses.unpricedMovementCount++;
      const productName = movement.productNameSnapshot ?? movement.product.name;
      rows.push({ section: "Pertes déclarées", date: movement.createdAt.toISOString(),
        metric: `${productName} — quantité perdue (${unit})`, value: Number(quantity), source: operation });
      rows.push({ section: "Pertes déclarées", date: movement.createdAt.toISOString(),
        metric: `${productName} — coût connu valorisé au prix snapshoté (EUR)`,
        value: knownCost === null ? "Non valorisé" : Number(knownCost),
        source: knownCost === null ? `${operation} · prix snapshoté absent` : operation });
      continue;
    }

    rows.push({ section: "Mouvements de stock", date: movement.createdAt.toISOString(),
      metric: `${movement.productNameSnapshot ?? movement.product.name} — ${movement.reason} (${movement.productUnitSnapshot ?? movement.product.unit})`,
      value: Number(movement.delta), source: movement.invoiceDocumentId ? "Pièce validée" : "Opération enregistrée" });
  }

  for (const waste of declaredWaste.records) {
    const service = waste.serviceSlot === "lunch" ? "midi" : waste.serviceSlot === "dinner" ? "soir" : "non ventilé";
    const source = `Déclaration ${waste.operationId} · service ${service} · ${waste.avoidability === "inedible" ? "non comestible" : "évitable"} · ${waste.stockMovementId ? "sortie matière tracée" : "sans nouvelle déduction matière"}`;
    rows.push({ section: "Pertes et déchets déclarés par service", date: waste.serviceDate,
      metric: `${wasteKindLabels[waste.kind] ?? waste.kind} — ${waste.productName ?? waste.preparationName ?? "élément lié"} (${waste.unit})`, value: waste.quantity, source });
    rows.push({ section: "Pertes et déchets déclarés par service", date: waste.serviceDate,
      metric: "Coût connu des lots (EUR)", value: waste.knownCost ?? "Non valorisé", source });
    if (waste.stockMovementId) { declaredLosses.reportedMovementCount++; if (waste.knownCost == null) declaredLosses.unpricedMovementCount++; }
  }
  for (const item of sales) rows.push({ section: "Ventes enregistrées", date: item.serviceDate.toISOString().slice(0, 10),
    metric: `${item.saleItem.name} — unités vendues`, value: item.quantity,
    source: item.source === "csv" ? item.revision ? "Import CSV corrigé" : "Import CSV" :
      item.source === "pos" ? item.revision ? "Caisse POS corrigée" : "Caisse POS" :
        item.source === "ticket_z" ? "Ticket Z vérifié" : "Saisie manuelle" });
  for (const item of productions) rows.push({ section: "Productions et refus", date: item.date.toISOString().slice(0, 10),
    metric: `${item.recipeName} — ${item.kind}`, value: item.portions,
    source: "Déclaration enregistrée — portions" });
  for (const order of orders) for (const line of order.lines)
    rows.push({ section: "Commandes validées", date: order.createdAt.toISOString(),
      metric: `${line.productName} — ${line.quantity} ${line.unit}`,
      value: Number(line.quantity.mul(line.pricePerUnit)), source: "Commande validée à transmettre — valeur indicative EUR" });

  return { from, to, timezone: "UTC", generatedAt: new Date().toISOString(), declaredLosses, declaredWaste, rows };
}
