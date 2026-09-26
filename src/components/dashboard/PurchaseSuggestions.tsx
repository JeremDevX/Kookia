import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "../common/Button";
import { useCart } from "../../context/useCart";
import PurchaseSuggestionCard from "./PurchaseSuggestionCard";
import { summarizePurchaseForecast } from "../../features/orders/purchaseForecastPresentation";
import { getPurchaseSuggestions, recordPurchaseSuggestionDecision, type PurchaseSuggestion, type PurchaseSuggestions as PurchaseSuggestionsDto } from "../../services/orderService";
import "./PurchaseSuggestions.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function PurchaseSuggestions({ refreshKey }: { refreshKey: number }) {
  const location = useLocation();
  const { cartItems, addToCart } = useCart();
  const [filter, setFilter] = useState<"toReview" | "needsCheck" | "covered" | "handled">("toReview");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PurchaseSuggestionsDto | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, NonNullable<PurchaseSuggestion["decision"]>>>({});
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");
  const [refreshRevision, setRefreshRevision] = useState(0);
  const attempts = useRef<Record<string, { key: string; operationId: string }>>({});
  const suggestionKeys = useRef<Record<string, string>>({});
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const retryFocusPending = useRef(false);

  useEffect(() => {
    if (!loading && location.hash === "#purchase-suggestions-title") {
      headingRef.current?.focus();
    }
  }, [loading, location.hash]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    getPurchaseSuggestions().then((suggestions) => {
      if (active) {
        setData(suggestions);
        const previousKeys = suggestionKeys.current;
        const nextKeys = Object.fromEntries(suggestions.suggestions.map((item) => [item.productId, item.suggestionKey]));
        setQuantities((current) => Object.fromEntries(suggestions.suggestions.flatMap((item) => item.estimatedQuantity === null
          ? [] : [[item.productId, previousKeys[item.productId] === item.suggestionKey
            ? current[item.productId] ?? String(item.estimatedQuantity) : String(item.estimatedQuantity)]])));
        setDecisions({});
        attempts.current = {};
        suggestionKeys.current = nextKeys;
      }
    }, (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Propositions indisponibles."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey, refreshRevision]);

  useEffect(() => {
    if (loading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (error) retryButtonRef.current?.focus();
    else headingRef.current?.focus();
  }, [data, error, loading]);

  const retrySuggestions = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    setRefreshRevision((value) => value + 1);
  };

  const decide = async (productId: string, suggestionKey: string, decision: "added" | "excluded") => {
    if (!data || busyProductId) return;
    const quantity = decision === "added" ? Number(quantities[productId]) : undefined;
    const key = JSON.stringify({ suggestionKey, decision, quantity });
    const operationId = attempts.current[productId]?.key === key
      ? attempts.current[productId].operationId : crypto.randomUUID();
    attempts.current[productId] = { key, operationId };
    setBusyProductId(productId); setError("");
    try {
      const saved = await recordPurchaseSuggestionDecision(productId, { operationId, suggestionKey, decision, quantity });
      setDecisions((current) => ({ ...current, [productId]: { kind: decision, operationId: saved.operationId, quantity: quantity ?? null, orderId: null } }));
      if (decision === "added") {
        const suggestion = data.suggestions.find((item) => item.productId === productId);
        if (!suggestion || quantity === undefined || !await addToCart({ id: operationId, productId,
          productName: suggestion.productName, quantity, unit: suggestion.unit, source: "dashboard",
          purchaseSuggestionOperationId: saved.operationId })) {
          throw new Error("Décision conservée, mais la commande en préparation n’a pas été mise à jour. Réessayez.");
        }
      }
      delete attempts.current[productId];
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Décision non enregistrée."); }
    finally { setBusyProductId(""); headingRef.current?.focus(); }
  };

  const reviewedData = data ? { ...data, suggestions: data.suggestions.map((item) => ({ ...item,
    decision: decisions[item.productId] ?? item.decision })) } : null;
  const summary = reviewedData ? summarizePurchaseForecast(reviewedData, cartItems.map((item) => item.productId)) : null;
  const visible = summary?.[filter].filter((item) => `${item.productName} ${item.supplierName}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr"))) ?? [];
  const supplierNames = [...new Set(visible.map((item) => item.supplierName))].sort((a, b) => a.localeCompare(b, "fr"));
  return <section className="purchase-suggestions" aria-labelledby="purchase-suggestions-title">
    <header className="workspace-section-heading"><h2 ref={headingRef} id="purchase-suggestions-title" tabIndex={-1}>Vos recommandations d’achat</h2>
      <span>{loading ? "Calcul…" : data?.status === "ready" ? `${summary?.toReview.length ?? 0} à acheter` : "Pas de quantité fiable"}</span>
    </header>
    {loading ? <p role="status">Vérification des services, recettes et comptages…</p> : error && !data
      ? <div role="alert"><p>{error}</p><Button ref={retryButtonRef} type="button" variant="outline" onClick={retrySuggestions}>Recharger les propositions</Button></div> : data && <>
        {data.workspaceMode === "demo" && <p className="purchase-suggestions-note">Les commandes de cet espace ne sont pas envoyées au fournisseur et ne modifient pas le stock.</p>}
        {data.status === "simulation_only" && <p className="purchase-suggestions-note" role="status">Les ventes disponibles ne sont pas retenues comme ventes enregistrées et ne permettent pas de préparer un achat.</p>}
        {data.status === "no_data" && <p>Aucune vente complète ne permet encore d’estimer le prochain service.</p>}
        {data.status === "insufficient_history" && <p>Complétez les 28 jours de services avant d’utiliser une estimation de besoin.</p>}
        {(data.status === "no_data" || data.status === "insufficient_history") && <p><Link to="/sales#sales-start">Compléter les ventes et les jours de service</Link> ou <Link to="/stocks">choisir vos produits dans les stocks</Link>.</p>}
        {data.status === "ready" && <>
          <p className="purchase-suggestions-period">Pour le service du {new Date(`${data.forecastDate}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · besoins calculés depuis vos ventes et recettes, stock vérifié déduit.</p>
          {data.blockers.length > 0 && <div className="purchase-suggestions-blockers" role="status">
            <strong>Besoin incomplet — aucune proposition ne peut être ajoutée.</strong>
            <ul>{data.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </div>}
          {summary && <>
            <div className="purchase-overview"><div><span>Achats recommandés restants</span><strong>{summary.toReview.length} produit{summary.toReview.length > 1 ? "s" : ""}</strong></div>
              <div><span>Budget proposé HT</span><strong>{summary.estimatedCost === null ? "—" : money.format(summary.estimatedCost)}</strong></div>
            </div>
            <div className="purchase-filters" aria-label="Filtrer les recommandations">{([
              ["toReview", "À acheter"], ["needsCheck", "À vérifier"], ["covered", "Stock suffisant"], ["handled", "Déjà traités"],
            ] as const).map(([key, label]) => <Button key={key} variant="outline" size="sm" aria-pressed={filter === key}
              onClick={() => setFilter(key)}>{label} · {summary[key].length}</Button>)}</div>
            <div className="orders-toolbar"><label>Rechercher un produit ou fournisseur<input type="search" value={search} placeholder="Huile, tomates, fournisseur…" onChange={(event) => setSearch(event.target.value)} /></label></div>
            {visible.length === 0 && <div className="purchase-empty" role="status"><strong>{search ? "Aucun résultat" : filter === "toReview" ? "Aucun achat à ajouter pour le moment" : "Aucun produit dans cette vue"}</strong>
              <p>{search ? "Essayez un autre nom de produit ou fournisseur." : "Consultez les autres vues ou complétez votre sélection depuis les stocks."}</p><Link to="/stocks">Choisir un autre produit</Link></div>}
            {supplierNames.map((supplierName) => <section className="purchase-supplier-group" key={supplierName} aria-label={supplierName}>
              <header><span>FOURNISSEUR</span><h3>{supplierName}</h3></header>
              <ul className="purchase-suggestion-list">{visible.filter((item) => item.supplierName === supplierName).map((item) => <PurchaseSuggestionCard
                key={item.productId} item={item} value={quantities[item.productId] ?? ""}
                inCart={cartItems.some((cartItem) => cartItem.productId === item.productId)}
                busy={busyProductId !== ""} saving={busyProductId === item.productId}
                onChange={(value) => { setQuantities((current) => ({ ...current, [item.productId]: value })); }}
                onDecide={(decision) => void decide(item.productId, item.suggestionKey, decision)} />)}</ul>
            </section>)}
          </>}
          <details><summary>Comprendre les hypothèses</summary><ul className="purchase-suggestions-assumptions">{data.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul></details>
        </>}
      </>}
    {error && data && <div role="alert"><p>{error}</p><Button ref={retryButtonRef} type="button" variant="outline" onClick={retrySuggestions}>
      Recharger les propositions
    </Button></div>}
  </section>;
}
