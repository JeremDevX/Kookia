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
const PAGE_SIZE = 10;
type StoredCatalogRequest = { requestKey: string; result: { status: "success"; products: Product[] } | { status: "error"; message: string } } | null;
const formatQuantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const formatPercent = (value: number) => new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(value);
const displayDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR");
export default function EstimatedOutflows({ from, to }: Props) {
  const location = useLocation();
  const [estimatePage, setEstimatePage] = useState(0);
  const [unmatchedPage, setUnmatchedPage] = useState(0);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [storedRequest, setStoredRequest] = useState<StoredEstimateRequest>(null);
  const [storedCatalogRequest, setStoredCatalogRequest] = useState<StoredCatalogRequest>(null);
  const [revision, setRevision] = useState(0);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const requestKey = JSON.stringify([from, to, revision]);
  const currentRequest = currentEstimateRequest(storedRequest, requestKey);
  const loading = currentRequest.status === "loading";
  const error = currentRequest.status === "error" ? currentRequest.message : "";
  const report = currentRequest.status === "success" ? currentRequest.report : null;
  const query = search.trim().toLocaleLowerCase("fr");
  const estimates = (report?.estimates ?? []).filter((entry) => `${entry.productName} ${entry.recipeName} ${entry.receiptReference}`.toLocaleLowerCase("fr").includes(query));
  const unmatched = (report?.unestimatedReceipts ?? []).filter((entry) => `${entry.productName} ${entry.receiptReference}`.toLocaleLowerCase("fr").includes(query));
  const receiptCount = new Set([...(report?.estimates ?? []), ...(report?.unestimatedReceipts ?? [])].map((entry) => entry.receiptId)).size;
  const recipeCount = new Set((report?.estimates ?? []).map((entry) => entry.recipeId)).size;
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
      if (active) {
        setStoredRequest({ requestKey, result: { status: "success", report: result } });
        setEstimatePage(0);
        setUnmatchedPage(0);
      }
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

    {loading ? <p role="status">Calcul des sorties estimées…</p> : error ? <div role="alert"><p>Estimations indisponibles : {error}</p>
      <Button ref={retryButtonRef} type="button" variant="outline" onClick={retry}>Recharger les estimations</Button>
    </div> : report && <>
      <div className="bilan-kpis">
        <article><h3>Réceptions analysées</h3><p className="bilan-kpi-value">{receiptCount}</p><p>Livraisons avec quantités positives</p><small>Sur la période sélectionnée</small></article>
        <article><h3>Recettes compatibles</h3><p className="bilan-kpi-value">{recipeCount}</p><p>{report.estimates.length} calculs disponibles</p><small>Recettes alternatives non cumulables</small></article>
        <article><h3>Entrées à examiner</h3><p className="bilan-kpi-value">{report.unestimatedReceipts.length}</p><p>Sans recette datée compatible</p><small>Propositions conditionnelles à vérifier</small></article>
      </div>
      <section className="bilan-attention"><h3>{report.unestimatedReceipts.length ? "Des recettes restent à vérifier" : "Comment utiliser ces estimations ?"}</h3>
        <div className="bilan-action-rows"><div><p>{report.unestimatedReceipts.length ? "Consultez les entrées à examiner, puis adaptez les propositions de recette. Elles ne sont pas encore des recettes en usage." : "Examinez le dosage et les autres ingrédients avant de retenir une recette. Ces résultats ne prouvent ni une vente ni une perte."}</p><Link to="/recipes">Consulter les recettes →</Link></div></div>
        <p>Répartition à valider : {formatPercent(report.assumptions.estimatedSalesShare)} en ventes et {formatPercent(report.assumptions.estimatedLossShare)} en pertes estimées. Aucun total n’est additionné entre recettes alternatives ou unités différentes.</p>
      </section>
      <details className="impact-reading-guide"><summary>Comprendre le calcul</summary>
      <p>Chaque ligne estime un ingrédient reçu. Les recettes alternatives ne s’additionnent pas ; les autres ingrédients et le stock ne sont pas vérifiés.</p>
      <p>Hypothèse de répartition : {formatPercent(report.assumptions.estimatedSalesShare)} en ventes estimées, {formatPercent(report.assumptions.estimatedLossShare)} en pertes estimées. À valider. Les quantités sont arrondies au millième ; le solde d’arrondi revient aux pertes estimées.</p></details>
      <div className="bilan-toolbar">
        <label>Rechercher une entrée<input type="search" value={search} placeholder="Ingrédient, recette ou livraison" onChange={(event) => { setSearch(event.target.value); setEstimatePage(0); setUnmatchedPage(0); }} /></label>
        <label>Afficher<select value={scope} onChange={(event) => { setScope(event.target.value); setEstimatePage(0); setUnmatchedPage(0); }}><option value="all">Toutes les entrées</option><option value="recipes">Avec recette compatible</option><option value="review">À examiner</option></select></label>
        <p role="status">{scope !== "review" ? `${estimates.length} calcul(s)` : ""}{scope === "all" ? " · " : ""}{scope !== "recipes" ? `${unmatched.length} entrée(s) à examiner` : ""}</p>
      </div>
      {((scope === "recipes" && !estimates.length) || (scope === "review" && !unmatched.length) || (scope === "all" && !estimates.length && !unmatched.length)) && <p role="status">Aucun résultat pour cette sélection.</p>}
      {scope !== "review" && estimates.length > 0 && <>
      <h3>Avec recette compatible</h3>
      <p>Comparez les possibilités ligne par ligne. Les quantités estimées ne sont pas des sorties de stock enregistrées.</p>
      <p id="estimated-outflows-table-hint" className="estimated-outflow-table-hint">10 lignes par page. Sur petit écran, faites défiler le tableau horizontalement ; au clavier, utilisez ← et → dans la zone du tableau.</p>
      <div className="sales-table-wrap" role="region" aria-label="Sorties estimées des ingrédients" aria-describedby="estimated-outflows-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="sales-table"><thead><tr><th scope="col">Réception</th><th scope="col">Ingrédient reçu</th><th scope="col">Recette</th><th scope="col">Ventes estimées</th><th scope="col">Pertes estimées</th><th scope="col">Calcul</th></tr></thead><tbody>
          {estimates.slice(estimatePage * PAGE_SIZE, (estimatePage + 1) * PAGE_SIZE).map((estimate) => <tr key={estimate.id}>
            <td>{displayDate(estimate.deliveryDate)}<br /><Link to={receiptDetailsHref(estimate.receiptId, from, to, "estimated-outflows-title")}
              aria-label={`Ouvrir la réception ${estimate.receiptReference} dans Achats`}>{estimate.receiptReference}</Link></td>
            <th scope="row">{estimate.productName}<br /><span className="outflow-secondary">{formatQuantity(estimate.receivedQuantity)} {estimate.unit}</span></th>
            <td>{estimate.recipeName}<br /><span className="outflow-secondary">v{estimate.recipeVersion} du {displayDate(estimate.recipeEffectiveFrom)}</span></td>
            <td>{formatQuantity(estimate.estimatedSoldQuantity)} {estimate.unit}<br /><span className="outflow-secondary">{formatQuantity(estimate.estimatedSoldPortions)} portions</span></td>
            <td>{formatQuantity(estimate.estimatedLossQuantity)} {estimate.unit}<br /><span className="outflow-secondary">{formatQuantity(estimate.estimatedLossPortions)} portions</span></td>
            <td><details className="outflow-details"><summary aria-label={`Calcul pour ${estimate.productName}, réception ${estimate.receiptReference}, ${estimate.recipeName}`}>Détails</summary>
              <p>Dosage : {formatQuantity(estimate.recipeIngredientQuantity)} {estimate.unit} / lot de {estimate.yieldPortions} portions.</p>
              <p>Portions possibles : {formatQuantity(estimate.possiblePortions)}.</p>
              <p>Autres ingrédients : {estimate.otherIngredientCount ? `${estimate.otherIngredientCount} non contrôlé(s)` : "aucun"}.</p>
            </details></td>
          </tr>)}
        </tbody></table>
      </div>
      <OutflowPagination page={estimatePage} total={estimates.length} onChange={setEstimatePage} label="Sorties estimées" />
      </>}
      {scope !== "recipes" && unmatched.length > 0 && <section aria-labelledby="estimated-outflows-unmatched-title">
        <h3 id="estimated-outflows-unmatched-title">Entrées à examiner</h3>
        <p>Une estimation conditionnelle est proposée si le catalogue permet un dosage et un rendement cohérents. La recette reste à vérifier.</p>
        {catalogError && <div role="alert"><p>Le catalogue n’est pas disponible pour établir les propositions : {catalogError}</p>
          <Button type="button" variant="outline" onClick={() => setCatalogRevision((value) => value + 1)}>Recharger les propositions</Button>
        </div>}
        {unmatchedReceiptIds && !catalogProducts && !catalogError && <p role="status">Recherche de recettes compatibles dans le catalogue…</p>}
        {catalogProducts && <p role="status">Analyse terminée. Chaque entrée est estimée ou signalée à couvrir.</p>}
        <p id="unmatched-table-hint" className="estimated-outflow-table-hint">10 entrées par page. Ouvrez une proposition pour consulter son calcul. Le tableau défile horizontalement ; au clavier, utilisez ← et →.</p>
        <div className="sales-table-wrap" role="region" aria-label="Entrées sans recette datée compatible" aria-describedby="unmatched-table-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
          <table className="sales-table"><thead><tr><th scope="col">Réception</th><th scope="col">Ingrédient</th><th scope="col">Quantité reçue</th><th scope="col">Proposition à vérifier</th></tr></thead>
            <tbody>{unmatched.slice(unmatchedPage * PAGE_SIZE, (unmatchedPage + 1) * PAGE_SIZE).map((entry) => <tr key={entry.id}>
              <td>{displayDate(entry.deliveryDate)}<br /><Link to={receiptDetailsHref(entry.receiptId, from, to, "estimated-outflows-title")}
                aria-label={`Ouvrir la réception ${entry.receiptReference} dans Achats`}>{entry.receiptReference}</Link></td>
              <th scope="row">{entry.productName}</th>
              <td>{formatQuantity(entry.receivedQuantity)} {entry.unit}</td>
              <td>{catalogProducts ? <details className="outflow-details"><summary aria-label={`Examiner la proposition pour ${entry.productName}, réception ${entry.receiptReference}`}>Examiner la proposition</summary>
                <ConditionalReceiptOutflow entry={entry} products={catalogProducts} />
              </details> : catalogError ? "Catalogue indisponible" : "Analyse en cours…"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <OutflowPagination page={unmatchedPage} total={unmatched.length} onChange={setUnmatchedPage} label="Entrées sans recette" />
      </section>}
    </>}
  </section>;
}

function OutflowPagination({ page, total, onChange, label }: { page: number; total: number; onChange: (page: number) => void; label: string }) {
  if (total <= PAGE_SIZE) return null;
  return <nav className="impact-monthly-navigation" aria-label={label}>
    <Button type="button" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)}>Précédent</Button>
    <p role="status">{label} : {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} sur {total}</p>
    <Button type="button" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => onChange(page + 1)}>Suivant</Button>
  </nav>;
}
