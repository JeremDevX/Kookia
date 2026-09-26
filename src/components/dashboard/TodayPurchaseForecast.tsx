import { purchasePreparationHref } from "../../features/orders/orderNavigation";
import { orderStepLabel } from "../../../shared/orderQuantity.js";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import Button from "../common/Button";
import { useCart } from "../../context/useCart";
import { purchaseForecastItemStatus, summarizePurchaseForecast } from "../../features/orders/purchaseForecastPresentation";
import { getPurchaseSuggestions, type PurchaseSuggestions } from "../../services/orderService";
import "./TodayPurchaseForecast.css";

const quantity = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });


export default function TodayPurchaseForecast() {
  const { cartItems, loading: cartLoading, loadError: cartError } = useCart();
  const [data, setData] = useState<PurchaseSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    getPurchaseSuggestions().then((result) => {
      if (active) { setData(result); setError(""); setLoading(false); }
    }, () => {
      if (active) { setError("Les prévisions d’achat n’ont pas pu être chargées."); setLoading(false); }
    });
    return () => { active = false; };
  }, [revision]);

  const summary = data ? summarizePurchaseForecast(data, cartItems.map((item) => item.productId)) : null;
  const unavailable = error || cartError;
  return <section className="today-forecast" aria-labelledby="today-forecast-title">
    <header className="today-forecast-heading">
      <div><span className="today-eyebrow">Vos prévisions</span>
        <h2 id="today-forecast-title" ref={headingRef} tabIndex={-1}>Préparer vos commandes</h2></div>
      <ShoppingBasket size={26} aria-hidden="true" />
    </header>
    {loading || cartLoading ? <p role="status">Calcul des besoins à partir de vos ventes, recettes et stocks…</p> : unavailable ?
      <div role="alert"><p>{unavailable}</p>
        {error ? <Button type="button" variant="outline" onClick={() => {
          setLoading(true); setError(""); setRevision((value) => value + 1); headingRef.current?.focus();
        }}>Réessayer</Button> : <Link to="/orders#selection">Vérifier la commande en préparation</Link>}
      </div> : data && summary && <>
        <p className="today-forecast-period">À partir du <strong>{date(data.forecastDate)}</strong></p>
        {data.status !== "ready" ? <div className="today-forecast-guidance">
          <h3>{data.status === "no_data" ? "Renseignez vos ventes pour obtenir une liste de courses" :
            data.status === "simulation_only" ? "Renseignez les ventes de votre restaurant" : "Il manque des journées de ventes"}</h3>
          <p>{data.status === "insufficient_history"
            ? `${data.completeServiceDays} journées renseignées sur les 28 nécessaires. Ajoutez les ventes manquantes ou indiquez les jours de fermeture pour obtenir les quantités conseillées.`
            : "Kookia s’appuie sur vos ventes et vos recettes pour estimer ce qu’il faudra en cuisine, puis tient compte de votre stock."}</p>
          <Link to="/sales#sales-start">Renseigner mes ventes<ArrowRight size={16} aria-hidden="true" /></Link>
        </div> : <>
          {data.blockers.length > 0 ? <div className="today-forecast-guidance">
            <h3>Complétez les données des services pour préparer la liste</h3>
            <p>Vérifiez les horaires, les cartes datées, les recettes et l’historique ventilé par service. Un horizon incomplet ne permet pas de valider une suggestion.</p>
            <details><summary>Voir ce qu’il manque</summary><ul>{data.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></details>
            <Link to="/sales">Vérifier les services et leurs cartes</Link>
          </div> : <>
            {summary.toReview.length > 0 && <>
              <div className="today-forecast-overview">
                <p><strong>{summary.toReview.length} produits à commander</strong><span>· {summary.supplierCount} fournisseur{summary.supplierCount > 1 ? "s" : ""}</span></p>
                {summary.estimatedCost !== null && <p><span>Estimation{summary.needsCheck.length > 0 ? " de cette liste" : ""} :</span><strong>{money(summary.estimatedCost)} HT</strong></p>}
              </div>
              <ul className="today-forecast-products" aria-label="Quantités d’achat proposées">
                {summary.toReview.map((item) => <li key={item.productId}>
                  <h3>{item.productName}</h3>
                  <p>{item.supplierName}</p>
                  <dl className="today-forecast-quantities">
                    <div><dt>Besoin estimé</dt><dd>{quantity(item.forecastNeed)} {item.unit}</dd></div>
                    <div><dt>En stock</dt><dd>{quantity(item.usableStock ?? item.countedStock!)} {item.unit}</dd></div>
                    <div className="today-forecast-to-order"><dt>À commander</dt><dd>{quantity(item.estimatedQuantity!)} {item.unit}</dd></div>
                  </dl>
                  {item.deliveryHorizon.status === "known" && <p>Livraison possible {date(item.deliveryHorizon.nextDeliveryDate)} · besoins jusqu’au {date(item.deliveryHorizon.throughDate)}.</p>}
                  {item.expectedQuantity > 0 && <p>Attendu : {quantity(item.expectedQuantity)} {item.unit}, non disponible. Achat proposé sous réserve de réception.</p>}
                  <small>{orderStepLabel(item.orderStep, item.unit)} · conditionnement renseigné, arrondi après stock et attendu conditionnel.</small>
                </li>)}
              </ul>
              <div className="today-forecast-actions"><Link className="btn btn-primary" to={purchasePreparationHref}>Préparer ma commande<ArrowRight size={17} aria-hidden="true" /></Link>
                <small>Quantités ajustables, sans envoi automatique.</small></div>
            </>}
            {summary.toReview.length === 0 && summary.needsCheck.length === 0 && summary.handled.length === 0 &&
              <p>{summary.covered.length > 0 ? "Le besoin estimé est couvert par le stock ou conditionnellement par des commandes attendues. Vérifiez les réceptions."
                : "La liste ne peut pas encore être calculée. Vérifiez les ventes et les recettes de vos plats."}</p>}
            {summary.needsCheck.length > 0 && <div className="today-forecast-guidance">
              <h3>Vérifiez les données de {summary.needsCheck.length} produit{summary.needsCheck.length > 1 ? "s" : ""} pour compléter la liste</h3>
              <ul>{summary.needsCheck.map((item) => <li key={item.productId}><Link to={`/stocks?product=${encodeURIComponent(item.productId)}`}>
                {item.productName} — {item.status === "unit_mismatch" ? "vérifier l’unité" : item.status === "supplier_constraints_missing" ? "renseigner fournisseur et conditionnement" : item.status === "availability_conflict" ? "résoudre un manque avant livraison ou rapprocher les lots" : "compter le stock"}</Link></li>)}</ul>
            </div>}
            {summary.covered.length > 0 && <details><summary>Besoin couvert ou conditionnel pour {summary.covered.length} produits</summary>
              <ul>{summary.covered.map((item) => <li key={item.productId}>{item.productName} : {quantity(item.usableStock ?? item.countedStock!)} {item.unit} en stock pour {quantity(item.forecastNeed)} {item.unit} prévus. {item.expectedQuantity > 0 && `${quantity(item.expectedQuantity)} ${item.unit} attendus, non disponibles — couverture sous réserve de réception.`}</li>)}</ul>
            </details>}
            {summary.handled.length > 0 && <details><summary>{summary.handled.length} produits déjà traités dans vos commandes</summary>
              <ul>{summary.handled.map((item) => <li key={item.productId}>{item.productName} — {purchaseForecastItemStatus(item)}</li>)}</ul>
              <Link to={purchasePreparationHref}>Reprendre la préparation</Link>
            </details>}
          </>}
          <details className="today-forecast-method"><summary>Comment Kookia prépare cette liste ?</summary>
            <p>Les estimations utilisent les ventes complètes ventilées par service jusqu’au {date(data.asOfDate)}, le jour de semaine et les cartes datées. L’historique insuffisant bloque la suggestion.</p>
            <p>Chaque fournisseur détermine l’horizon : jours de livraison, délai et heure limite Europe/Paris. Les besoins couvrent les services planifiés jusqu’à la veille de la livraison suivante. Le jour d’arrivée ne garantit pas une disponibilité avant le service.</p>
            <p>Les commandes attendues sont distinguées du stock disponible et déduites uniquement sous réserve de réception, avec date confirmée. Les colis réels renseignés déterminent l’arrondi. Le chef vérifie et valide la commande.</p>
            <p>Le coût est estimé avec les prix HT de vos fiches produits. La météo et les événements ne sont pas pris en compte.</p>
            <Link to="/predictions">Voir le détail des prévisions de ventes</Link>
          </details>
        </>}
      </>}
  </section>;
}
