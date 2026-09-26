import { isPurchaseSuggestionHandled } from "../../features/orders/purchaseForecastPresentation";
import { Link } from "react-router-dom";
import { Check, Plus, X } from "lucide-react";
import { orderStepLabel } from "../../../shared/orderQuantity.js";
import { isValidOrderQuantity } from "../../domain/orders/orderQuantity";
import type { PurchaseSuggestion } from "../../services/orderService";
import Button from "../common/Button";

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
      : !item.canAdd && <p className="purchase-item-status">{item.status === "covered" ? "Votre stock couvre le besoin prévu." : item.status === "needs_stock_count" || item.status === "unit_mismatch" ? <><Link to={`/stocks?product=${encodeURIComponent(item.productId)}`}>Vérifier {item.status === "unit_mismatch" ? "l’unité" : "le stock"} de {item.productName}</Link> avant de commander.</> : item.reason}</p>}
  </li>;
}
