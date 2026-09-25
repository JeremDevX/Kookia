import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { getIngredientOutflowEstimates, type IngredientOutflowEstimateReport } from "../../services/ingredientOutflowEstimateService";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

interface Props { from: string; to: string }
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const formatPercent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");

export default function EstimatedOutflows({ from, to }: Props) {
  const [report, setReport] = useState<IngredientOutflowEstimateReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const retryFocusPending = useRef(false);

  useEffect(() => {
    let active = true;
    getIngredientOutflowEstimates(from, to).then((result) => {
      if (active) { setReport(result); setLoading(false); }
    }).catch((cause: unknown) => {
      if (active) { setError(cause instanceof Error ? cause.message : "Réessayez."); setLoading(false); }
    });
    return () => { active = false; };
  }, [from, to, revision]);

  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading]);

  const retry = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setLoading(true);
    setError("");
    setRevision((value) => value + 1);
  };

  return <section className="sales-panel estimated-outflows" aria-labelledby="estimated-outflows-title">
    <h2 ref={headingRef} id="estimated-outflows-title" tabIndex={-1}>Sorties estimées par recette</h2>
    <p>À partir des réceptions réelles, chaque recette datée utilisant l’ingrédient reçu est présentée avec ses sorties estimées. Les quantités sont calculées selon le dosage de l’ingrédient et le rendement de la recette. Ce calcul n’enregistre aucune vente, perte ou sortie de stock.</p>
    <p>Les recettes d’une même réception sont des alternatives : ne les additionnez pas. Les autres ingrédients de la recette ne sont pas contrôlés dans ce calcul.</p>
    {loading ? <p role="status">Calcul des sorties estimées…</p> : error ? <div role="alert"><p>Estimations indisponibles : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retry}>Recharger les estimations</Button>
    </div> : report && <>
      <p>Hypothèse appliquée à la quantité reçue : {formatPercent(report.assumptions.estimatedSalesShare)} en ventes estimées et {formatPercent(report.assumptions.estimatedLossShare)} en pertes estimées. Ce ratio n’est pas une mesure du restaurant.</p>
      {report.estimates.length ? <>
      <p id="estimated-outflows-table-hint" className="sales-table-hint">Les références correspondent aux livraisons rapprochées. Sur petit écran, faites défiler le tableau horizontalement. Au clavier, placez le focus sur le tableau puis utilisez ← et →.</p>
      <div className="sales-table-wrap" role="region" aria-label="Sorties estimées des ingrédients" aria-describedby="estimated-outflows-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="sales-table"><thead><tr><th>Date de réception</th><th>Livraison</th><th>Ingrédient reçu</th><th>Recette et version datée</th><th>Portions possibles</th><th>Quantité estimée en ventes</th><th>Quantité estimée en pertes</th><th>Autres ingrédients</th></tr></thead><tbody>
          {report.estimates.map((estimate) => <tr key={estimate.id}>
            <td>{displayDate(estimate.deliveryDate)}</td><td><code>{estimate.receiptReference}</code></td>
            <td>{estimate.productName}: {formatQuantity(estimate.receivedQuantity)} {estimate.unit}</td>
            <td>{estimate.recipeName} · v{estimate.recipeVersion} du {displayDate(estimate.recipeEffectiveFrom)}</td>
            <td>{formatQuantity(estimate.possiblePortions)} (rendement {estimate.yieldPortions})</td>
            <td>{formatQuantity(estimate.estimatedSoldQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedSoldPortions)} portions</td>
            <td>{formatQuantity(estimate.estimatedLossQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedLossPortions)} portions</td>
            <td>{estimate.otherIngredientCount ? `${estimate.otherIngredientCount} non contrôlé(s)` : "Aucun"}</td>
          </tr>)}
        </tbody></table>
      </div>
      </> : <p role="status">Aucune réception réelle associée à une recette datée compatible sur la période.</p>}
    </>}
  </section>;
}
