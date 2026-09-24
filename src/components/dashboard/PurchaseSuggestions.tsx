import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { useCart } from "../../context/useCart";
import { isValidOrderQuantity } from "../../domain/orders/orderQuantity";
import { getPurchaseSuggestions, recordPurchaseSuggestionDecision, type PurchaseSuggestions as PurchaseSuggestionsDto } from "../../services/orderService";
import "./PurchaseSuggestions.css";

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default function PurchaseSuggestions() {
  const { cartItems, addToCart } = useCart();
  const [data, setData] = useState<PurchaseSuggestionsDto | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, "added" | "excluded">>({});
  const [loading, setLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState("");
  const [error, setError] = useState("");
  const operationIds = useRef<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    getPurchaseSuggestions().then((suggestions) => {
      if (active) {
        setData(suggestions);
        setQuantities(Object.fromEntries(suggestions.suggestions.flatMap((item) =>
          item.estimatedQuantity === null ? [] : [[item.productId, String(item.estimatedQuantity)]])));
      }
    }, (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Propositions indisponibles."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const decide = async (productId: string, suggestionKey: string, decision: "added" | "excluded") => {
    if (!data || busyProductId) return;
    const operationId = operationIds.current[productId] ?? crypto.randomUUID();
    operationIds.current[productId] = operationId;
    setBusyProductId(productId); setError("");
    try {
      const quantity = decision === "added" ? Number(quantities[productId]) : undefined;
      const saved = await recordPurchaseSuggestionDecision(productId, { operationId, suggestionKey, decision, quantity });
      if (decision === "added") {
        const suggestion = data.suggestions.find((item) => item.productId === productId);
        if (!suggestion || quantity === undefined || !await addToCart({ id: operationId, productId,
          productName: suggestion.productName, quantity, unit: suggestion.unit, source: "dashboard",
          purchaseSuggestionOperationId: saved.operationId })) {
          throw new Error("Décision conservée, mais la commande en préparation n’a pas été mise à jour. Réessayez.");
        }
      }
      setDecisions((current) => ({ ...current, [productId]: decision }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Décision non enregistrée."); }
    finally { setBusyProductId(""); }
  };

  return <section className="purchase-suggestions" aria-labelledby="purchase-suggestions-title">
    <header className="workspace-section-heading"><h2 id="purchase-suggestions-title">Besoins à revoir</h2>
      <span>{loading ? "Calcul…" : data?.status === "ready" ? `${data.suggestions.length} produit${data.suggestions.length === 1 ? "" : "s"}` : "Pas de quantité fiable"}</span>
    </header>
    {loading ? <p role="status">Vérification des services, recettes et comptages…</p> : error && !data
      ? <p role="alert">{error}</p> : data && <>
        {data.workspaceMode === "demo" && <p className="purchase-suggestions-note">Espace de démonstration : toute commande validée reste simulée, sans envoi ni mouvement de stock.</p>}
        {data.status === "simulation_only" && <p className="purchase-suggestions-note" role="status">Les ventes utilisées sont simulées. Elles ne peuvent pas préparer un achat dans cet espace réel.</p>}
        {data.status === "no_data" && <p>Aucune vente complète ne permet encore d’estimer le prochain service.</p>}
        {data.status === "insufficient_history" && <p>Complétez les 28 jours de services avant d’utiliser une estimation de besoin.</p>}
        {data.status === "ready" && <>
          <p className="purchase-suggestions-period">Ventes jusqu’au {data.asOfDate} · prochain service prévu le {data.forecastDate} · {data.provenance === "demo_simulation" ? "démonstration" : "ventes enregistrées"}.</p>
          {data.blockers.length > 0 && <div className="purchase-suggestions-blockers" role="status">
            <strong>Besoin incomplet — aucune proposition ne peut être ajoutée.</strong>
            <ul>{data.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
          </div>}
          {data.suggestions.length === 0 ? <p>Aucun ingrédient projetable à partir des recettes reliées aux ventes.</p> : <ul className="purchase-suggestion-list">
            {data.suggestions.map((item) => {
              const inCart = cartItems.some((cartItem) => cartItem.productId === item.productId);
              const decided = decisions[item.productId];
              const quantity = Number(quantities[item.productId] ?? "");
              const validQuantity = isValidOrderQuantity(quantities[item.productId] ?? "");
              return <li key={item.productId} className="purchase-suggestion-card">
                <div className="purchase-suggestion-heading"><h3>{item.productName}</h3><span>{item.supplierName}</span></div>
                <p>Besoin prévu : {item.forecastNeed} {item.unit} · {item.reason}</p>
                {item.countedStock === null
                  ? <p>Stock non déduit — aucun comptage à jour. <Link to={`/stocks?product=${encodeURIComponent(item.productId)}`}>Vérifier le stock</Link></p>
                  : <p>Dernier comptage {item.countDate} : {item.countedStock} {item.unit}.</p>}
                <ul className="purchase-suggestion-sources">{item.sources.map((source, index) => <li key={`${source.recipeName}-${index}`}>
                  {source.saleItemName} → {source.recipeName} (version {source.recipeVersion}) : {source.quantity} {item.unit}
                </li>)}</ul>
                {item.estimatedQuantity !== null && <p>Reste à revoir : <strong>{item.estimatedQuantity} {item.unit}</strong> · estimation au prix actuel du catalogue : {item.estimatedCost === null ? "—" : money.format(item.estimatedCost)}.</p>}
                {decided === "added" || inCart
                  ? <p role="status">Présent dans la commande en préparation. La validation finale reste à faire.</p>
                  : decided === "excluded" ? <p role="status">Proposition écartée et conservée dans l’historique des décisions.</p>
                    : item.canAdd ? <div className="purchase-suggestion-actions">
                      <label htmlFor={`suggested-quantity-${item.productId}`}>Quantité à commander ({item.unit})</label>
                      <input className="input-field" id={`suggested-quantity-${item.productId}`} type="number" min="0.001" step="0.001"
                        value={quantities[item.productId] ?? ""} disabled={busyProductId === item.productId}
                        onChange={(event) => setQuantities((current) => ({ ...current, [item.productId]: event.target.value }))} />
                      {!validQuantity && <p role="alert">Saisissez une quantité positive, au plus 1 000 000 avec trois décimales maximum.</p>}
                      <Button onClick={() => void decide(item.productId, item.suggestionKey, "added")}
                        disabled={busyProductId !== "" || !validQuantity || !Number.isFinite(quantity)}>Ajouter à la commande</Button>
                      <Button variant="outline" onClick={() => void decide(item.productId, item.suggestionKey, "excluded")}
                        disabled={busyProductId !== ""}>Écarter</Button>
                    </div> : <p>{item.status === "covered" ? "Aucun achat proposé pour ce produit." : "Comptage ou unité à corriger avant toute proposition."}</p>}
              </li>;
            })}
          </ul>}
          <ul className="purchase-suggestions-assumptions">{data.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        </>}
      </>}
    {error && data && <p role="alert">{error}</p>}
  </section>;
}
