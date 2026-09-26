import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { getIngredientOutflowEstimates } from "../../services/ingredientOutflowEstimateService";
import { getProducts } from "../../services/productService";
import type { Product } from "../../domain/inventory/product.types";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { receiptDetailsHref } from "../../utils/analyticsNavigation";
import { currentEstimateRequest, type StoredEstimateRequest } from "./estimatedOutflowsState";
import ConditionalReceiptOutflow from "./ConditionalReceiptOutflow";

interface Props { from: string; to: string }
type StoredCatalogRequest = { requestKey: string; result: { status: "success"; products: Product[] } | { status: "error"; message: string } } | null;
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const formatPercent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
export default function EstimatedOutflows({ from, to }: Props) {
  const location = useLocation();
  const [storedRequest, setStoredRequest] = useState<StoredEstimateRequest>(null);
  const [storedCatalogRequest, setStoredCatalogRequest] = useState<StoredCatalogRequest>(null);
  const [revision, setRevision] = useState(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const requestKey = JSON.stringify([from, to, revision]);
  const currentRequest = currentEstimateRequest(storedRequest, requestKey);
  const loading = currentRequest.status === "loading";
  const error = currentRequest.status === "error" ? currentRequest.message : "";
  const report = currentRequest.status === "success" ? currentRequest.report : null;
  const unmatchedReceiptIds = report?.unestimatedReceipts.map((entry) => entry.id).join(",") ?? "";
  const catalogRequestKey = JSON.stringify([from, to, revision, catalogRevision, unmatchedReceiptIds]);
  const currentCatalogRequest = storedCatalogRequest?.requestKey === catalogRequestKey ? storedCatalogRequest.result : null;
  const catalogProducts = currentCatalogRequest?.status === "success" ? currentCatalogRequest.products : null;
  const catalogError = currentCatalogRequest?.status === "error" ? currentCatalogRequest.message : "";
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const retryFocusPending = useRef(false);

  useEffect(() => {
    let active = true;
    getIngredientOutflowEstimates(from, to).then((result) => {
      if (active) setStoredRequest({ requestKey, result: { status: "success", report: result } });
    }).catch((cause: unknown) => {
      if (active) setStoredRequest({ requestKey, result: { status: "error",
        message: cause instanceof Error ? cause.message : "Réessayez." } });
    });
    return () => { active = false; };
  }, [from, to, revision, requestKey]);

  useEffect(() => {
    if (!unmatchedReceiptIds) return;
    let active = true;
    getProducts().then((products) => {
      if (active) setStoredCatalogRequest({ requestKey: catalogRequestKey, result: { status: "success", products } });
    }).catch((cause: unknown) => {
      if (active) setStoredCatalogRequest({ requestKey: catalogRequestKey, result: { status: "error",
        message: cause instanceof Error ? cause.message : "Réessayez." } });
    });
    return () => { active = false; };
  }, [catalogRequestKey, unmatchedReceiptIds]);

  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [error, loading]);

  useEffect(() => {
    if (location.hash === "#estimated-outflows-title" && !loading) headingRef.current?.focus();
  }, [loading, location.hash]);

  const retry = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRevision((value) => value + 1);
  };

  return <section className="sales-panel estimated-outflows" aria-labelledby="estimated-outflows-title">
    <h2 ref={headingRef} id="estimated-outflows-title" tabIndex={-1}>Sorties estimées par recette</h2>
    <p>Calculées depuis les réceptions confirmées, les recettes datées, leur dosage et leur rendement. Aucune opération n’est enregistrée.</p>
    <p>Chaque ligne estime un ingrédient reçu. Les recettes alternatives ne s’additionnent pas ; les autres ingrédients et le stock ne sont pas vérifiés.</p>
    {loading ? <p role="status">Calcul des sorties estimées…</p> : error ? <div role="alert"><p>Estimations indisponibles : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retry}>Recharger les estimations</Button>
    </div> : report && <>
      <p>Hypothèse de répartition : {formatPercent(report.assumptions.estimatedSalesShare)} en ventes estimées, {formatPercent(report.assumptions.estimatedLossShare)} en pertes estimées. À valider. Les quantités sont arrondies au millième ; le solde d’arrondi revient aux pertes estimées.</p>
      {report.estimates.length ? <>
      <p id="estimated-outflows-table-hint" className="estimated-outflow-table-hint">Les références correspondent aux livraisons rapprochées. Au clavier, placez le focus sur le tableau puis utilisez ← et →.</p>
      <p className="estimated-outflow-cards-hint">Les sorties sont présentées en fiches pour faciliter la lecture sur cet écran.</p>
      <div className="estimated-outflow-table">
      <div className="sales-table-wrap" role="region" aria-label="Sorties estimées des ingrédients" aria-describedby="estimated-outflows-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="sales-table"><thead><tr><th>Date de réception</th><th>Livraison</th><th>Ingrédient reçu</th><th>Recette et version datée</th><th>Dosage de la recette</th><th>Portions possibles</th><th>Quantité estimée en ventes</th><th>Quantité estimée en pertes</th><th>Autres ingrédients</th></tr></thead><tbody>
          {report.estimates.map((estimate) => <tr key={estimate.id}>
            <td>{displayDate(estimate.deliveryDate)}</td><td><Link to={receiptDetailsHref(estimate.receiptId, from, to, "estimated-outflows-title")}
              aria-label={`Ouvrir la réception ${estimate.receiptReference} dans Achats`}>{estimate.receiptReference}</Link></td>
            <td>{estimate.productName}: {formatQuantity(estimate.receivedQuantity)} {estimate.unit}</td>
            <td>{estimate.recipeName} · v{estimate.recipeVersion} du {displayDate(estimate.recipeEffectiveFrom)}</td>
            <td>{formatQuantity(estimate.recipeIngredientQuantity)} {estimate.unit} / lot de {estimate.yieldPortions}</td>
            <td>{formatQuantity(estimate.possiblePortions)} (rendement {estimate.yieldPortions})</td>
            <td>{formatQuantity(estimate.estimatedSoldQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedSoldPortions)} portions</td>
            <td>{formatQuantity(estimate.estimatedLossQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedLossPortions)} portions</td>
            <td>{estimate.otherIngredientCount ? `${estimate.otherIngredientCount} non contrôlé(s)` : "Aucun"}</td>
          </tr>)}
        </tbody></table>
      </div>
      </div>
      <ul className="estimated-outflow-cards" aria-label="Sorties estimées des ingrédients">
        {report.estimates.map((estimate) => <li className="estimated-outflow-card" key={estimate.id}>
          <div className="estimated-outflow-card-header">
            <strong>{displayDate(estimate.deliveryDate)}</strong>
            <Link to={receiptDetailsHref(estimate.receiptId, from, to, "estimated-outflows-title")}
              aria-label={`Ouvrir la réception ${estimate.receiptReference} dans Achats`}>{estimate.receiptReference}</Link>
          </div>
          <dl>
            <div><dt>Ingrédient reçu</dt><dd>{estimate.productName}: {formatQuantity(estimate.receivedQuantity)} {estimate.unit}</dd></div>
            <div><dt>Recette et version datée</dt><dd>{estimate.recipeName} · v{estimate.recipeVersion} du {displayDate(estimate.recipeEffectiveFrom)}</dd></div>
            <div><dt>Dosage de la recette</dt><dd>{formatQuantity(estimate.recipeIngredientQuantity)} {estimate.unit} / lot de {estimate.yieldPortions}</dd></div>
            <div><dt>Portions possibles</dt><dd>{formatQuantity(estimate.possiblePortions)} (rendement {estimate.yieldPortions})</dd></div>
            <div><dt>Quantité estimée en ventes</dt><dd>{formatQuantity(estimate.estimatedSoldQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedSoldPortions)} portions</dd></div>
            <div><dt>Quantité estimée en pertes</dt><dd>{formatQuantity(estimate.estimatedLossQuantity)} {estimate.unit} · {formatQuantity(estimate.estimatedLossPortions)} portions</dd></div>
            <div><dt>Autres ingrédients</dt><dd>{estimate.otherIngredientCount ? `${estimate.otherIngredientCount} non contrôlé(s)` : "Aucun"}</dd></div>
          </dl>
        </li>)}
      </ul>
      </> : report.unestimatedReceipts.length === 0 && <p role="status">Aucune réception enregistrée positive sur la période.</p>}
      {report.unestimatedReceipts.length > 0 && <section aria-labelledby="estimated-outflows-unmatched-title">
        <h3 id="estimated-outflows-unmatched-title">Entrées sans recette datée compatible</h3>
        <p>Une estimation conditionnelle est proposée si le catalogue permet un dosage et un rendement cohérents. La recette reste à vérifier.</p>
        {catalogError && <div role="alert"><p>Le catalogue n’est pas disponible pour établir les propositions : {catalogError}</p>
          <Button type="button" variant="outline" onClick={() => setCatalogRevision((value) => value + 1)}>Recharger les propositions</Button>
        </div>}
        {unmatchedReceiptIds && !catalogProducts && !catalogError && <p role="status">Recherche de recettes compatibles dans le catalogue…</p>}
        {catalogProducts && <p role="status">Analyse terminée. Chaque entrée est estimée ou signalée à couvrir.</p>}
        <ul className="estimated-unmatched-list">{report.unestimatedReceipts.map((entry) => <li className="estimated-unmatched-receipt" key={entry.id}>
          <strong><Link to={receiptDetailsHref(entry.receiptId, from, to, "estimated-outflows-title")}
            aria-label={`Ouvrir la réception ${entry.receiptReference} dans Achats`}>
            {displayDate(entry.deliveryDate)} · {entry.receiptReference}
          </Link></strong>
          <p>{entry.productName} : {formatQuantity(entry.receivedQuantity)} {entry.unit} · aucune version de recette compatible à cette date.</p>
          {catalogProducts && <ConditionalReceiptOutflow entry={entry} products={catalogProducts} />}
        </li>)}</ul>
      </section>}
    </>}
  </section>;
}
