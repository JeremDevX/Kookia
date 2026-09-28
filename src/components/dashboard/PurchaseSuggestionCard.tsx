import { isPurchaseSuggestionHandled } from "../../features/orders/purchaseForecastPresentation";
import { Link } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { orderStepLabel } from "../../../shared/orderQuantity.js";
import { isValidOrderQuantity } from "../../domain/orders/orderQuantity";
import type { PurchaseSuggestion } from "../../services/orderService";
import Button from "../common/Button";
import PurchaseWeatherDetails from "./PurchaseWeatherDetails";

const number = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(value);
const money = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

interface Props {
  item: PurchaseSuggestion;
  value: string;
  inCart: boolean;
  busy: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onDecide: (decision: "added" | "excluded") => void;
}

export default function PurchaseSuggestionCard({ item, value, inCart, busy, saving, onChange, onDecide }: Props) {
  const valid = isValidOrderQuantity(value, item.orderStep);
  const editable = item.canAdd && !isPurchaseSuggestionHandled(item, inCart);
  return <li className="purchase-suggestion-card">
    <div className="purchase-product-summary">
      <h4>{item.productName}</h4>
      <p className="purchase-stock-context">Besoin estimé {number(item.forecastNeed)} {item.unit} · Stock {item.countedStock === null ? "à vérifier" : `${number(item.countedStock)} ${item.unit}`}</p>
      <PurchaseWeatherDetails references={item.weatherAdjustments} />
      {item.deliveryHorizon?.status === "known" && <p>Livraison possible le {item.deliveryHorizon.nextDeliveryDate} · besoins jusqu’au {item.deliveryHorizon.throughDate} (Europe/Paris).</p>}
      {item.expectedQuantity > 0 && <p>Attendu : {number(item.expectedQuantity)} {item.unit}, non disponible en stock. Besoin sous réserve de réception : {item.conditionalNetNeed === null ? "à vérifier" : number(item.conditionalNetNeed)} {item.unit}.</p>}
      {item.usableStock !== undefined && item.usableStock !== null && <p>Stock compté hors échéances dépassées : {number(item.usableStock)} {item.unit} · échéance dépassée : {number(item.expiredQuantity ?? 0)} {item.unit}.</p>}
      {(item.unknownExpiryQuantity ?? 0) > 0 && <p>Échéance inconnue pour {number(item.unknownExpiryQuantity!)} {item.unit} : disponibilité à vérifier par le chef.</p>}
      {(item.beforeDeliveryShortage ?? 0) > 0 && <p role="status">Manque avant livraison : {number(item.beforeDeliveryShortage!)} {item.unit}. Les achats proposés pour la suite ne résolvent pas ce manque.</p>}
      {(item.shortages?.length ?? 0) > 0 && <details><summary>Manques estimés par date, après stock et attendu conditionnel</summary><ul>{item.shortages!.map((shortage, index) => <li key={`${shortage.date}:${index}`}>{shortage.date}{shortage.slot === "lunch" ? " midi" : shortage.slot === "dinner" ? " soir" : ""} : {number(shortage.quantity)} {item.unit}</li>)}</ul></details>}
      {inCart && <span className="purchase-added"><Check size={14} aria-hidden="true" /> Dans ma sélection</span>}
    </div>
      {editable ? <div className="purchase-quantity-edit">
        <label htmlFor={`suggested-quantity-${item.productId}`}>À commander ({item.unit})</label>
        <input className="input-field" id={`suggested-quantity-${item.productId}`} type="number" min={item.orderStep}
          step={item.orderStep} max={1000000} value={value} disabled={busy} aria-invalid={!valid}
          aria-describedby={`suggested-step-${item.productId}`} onChange={(event) => onChange(event.target.value)} />
        <small id={`suggested-step-${item.productId}`}>{orderStepLabel(item.orderStep, item.unit)}</small>
      </div> : item.estimatedQuantity !== null && <div className="purchase-quantity-read"><span>Achat proposé</span><strong>{number(item.estimatedQuantity)} {item.unit}</strong></div>}
      {editable && <div className="purchase-line-budget"><span>Estimation HT</span><strong>{valid ? money(Number(value) * item.currentUnitPrice) : "—"}</strong></div>}
    {editable && <div className="purchase-suggestion-actions">
      <Button size="sm" disabled={busy || !valid} icon={<Plus size={16} aria-hidden="true" />} aria-label={`Ajouter ${item.productName} à ma sélection`} onClick={() => onDecide("added")}>{saving ? "Ajout…" : "Ajouter"}</Button>
      <Button size="sm" variant="ghost" disabled={busy} title={`Écarter ${item.productName}`} aria-label={`Écarter ${item.productName}`} onClick={() => onDecide("excluded")}><X size={16} aria-hidden="true" /></Button>
    </div>}
    {editable && !valid && <p className="purchase-item-status" role="alert">Respectez le pas de commande, avec une quantité positive jusqu’à 1 000 000.</p>}
    {item.decision?.orderId ? <p className="purchase-item-status">Commande enregistrée. <Link to={`/orders#order-${item.decision.orderId}`}>Voir la commande</Link></p>
      : inCart ? null
      : item.decision?.kind === "excluded" ? <p className="purchase-item-status">Écarté de cette proposition.</p>
      : !item.canAdd && <p className="purchase-item-status">{item.status === "covered" ? item.reason : item.status === "needs_stock_count" || item.status === "unit_mismatch" ? <><Link to={`/stocks?product=${encodeURIComponent(item.productId)}`}>Vérifier {item.status === "unit_mismatch" ? "l’unité" : "le stock"} de {item.productName}</Link> avant de commander.</> : item.status === "supplier_constraints_missing" ? <>{item.reason} <Link to="/settings">Paramètres fournisseur</Link> · <Link to={`/stocks?product=${encodeURIComponent(item.productId)}`}>Conditionnement du produit</Link></> : item.reason}</p>}
  </li>;
}
