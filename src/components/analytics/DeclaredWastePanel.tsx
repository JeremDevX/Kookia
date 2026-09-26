import type { DeclaredWasteSummary } from "../../../shared/declaredWaste";
import { wasteKindLabels } from "../../../shared/declaredWaste";
export default function DeclaredWastePanel({ summary }: { summary: DeclaredWasteSummary }) {
  return <section aria-labelledby="declared-waste-title" className="bilan-loss-priorities">
    <h3 id="declared-waste-title">Pertes et déchets déclarés par service</h3>
    <p>Quantités déclarées, séparées par nature et unité. Les matières brutes sont déjà incluses dans les pertes de stock ci-dessus ; les parures, invendus et retours liés à une préparation ne déduisent pas à nouveau les ingrédients.</p>
    <p>Aucune estimation n’est ajoutée aux mesures déclarées. L’absence de déclaration ne signifie pas zéro déchet. Aucun coût des préparations ou économie évitée n’est extrapolé.</p>
    {!summary.records.length && <p>Aucune déclaration typée sur cette période. Les anciens mouvements restent dans les pertes par produit, avec leur date d’enregistrement UTC.</p>}
    <ul>{summary.totals.map((row) => <li key={`${row.kind}:${row.avoidability}:${row.unit}`}>
      {wasteKindLabels[row.kind] ?? row.kind} · {row.avoidability === "inedible" ? "non comestible" : "évitable"} : {row.quantity.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} {row.unit} · {row.recordCount} déclarations
    </li>)}</ul>
    {summary.excludedSimulationCount > 0 && <p>{summary.excludedSimulationCount} déclarations hors bilan mesuré exclues.</p>}
    {summary.records.length > 0 && <details><summary>Traçabilité des déclarations ({summary.records.length})</summary>
      <ul>{summary.records.map((row) => <li key={row.id}>{row.serviceDate} · {row.serviceSlot === "lunch" ? "midi" : row.serviceSlot === "dinner" ? "soir" : "non ventilé"} · {wasteKindLabels[row.kind] ?? row.kind} · {row.productName ?? row.preparationName} · {row.quantity} {row.unit} · {row.knownCost == null ? "non valorisé" : `${row.knownCost.toFixed(2)} € (coût des lots)`}
        {row.productionId && <span> · préparation {row.productionId}</span>}{row.lotId && <span> · lot {row.lotId}</span>} · opération {row.operationId}{row.note && <p>{row.note}</p>}
      </li>)}</ul>
    </details>}
  </section>;
}
