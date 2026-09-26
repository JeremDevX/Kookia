import { getOrderStep, orderStepLabel } from "../../../shared/orderQuantity.js";
import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import { CheckCircle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import type { OrderRecommendation } from "../../features/orders/orderRecommendations";
import { validateOrder, type PurchaseOrder } from "../../services/orderService";
import { isValidOrderQuantity } from "../../domain/orders/orderQuantity";
import type { Product, Supplier } from "../../types";

interface OrderGeneratorProps {
  recommendations: OrderRecommendation[];
  products: Product[];
  suppliers: Supplier[];
  catalogLoading: boolean;
  catalogError: Error | null;
  onRetryCatalog: () => Promise<void>;
  onClose: () => void;
  onValidated?: () => void;
}

export default function OrderGenerator({ recommendations, products, suppliers, catalogLoading, catalogError,
  onRetryCatalog, onClose, onValidated }: OrderGeneratorProps) {
  const [quantities, setQuantities] = useState(() => recommendations.map((item) => String(item.quantity)));
  const [operationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const retryFocusPending = useRef(false);
  const validQuantity = (value: string, index: number) => {
    const product = products.find((candidate) => candidate.id === recommendations[index].productId);
    return !!product && isValidOrderQuantity(value, getOrderStep(product));
  };
  const valid = recommendations.length > 0 && quantities.every(validQuantity);
  const total = recommendations.reduce((sum, item, index) => sum + (products.find((product) => product.id === item.productId)?.pricePerUnit ?? 0) * (Number(quantities[index]) || 0), 0);

  useEffect(() => {
    if (catalogLoading || !retryFocusPending.current) return;
    retryFocusPending.current = false;
    if (document.activeElement !== document.body) return;
    if (catalogError) retryButtonRef.current?.focus();
    else formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [catalogError, catalogLoading, products]);

  const retryCatalog = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    void onRetryCatalog();
  };

  const handleValidate = async () => {
    if (saving || !valid) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = await validateOrder(operationId, recommendations.map((item, index) => ({
        productId: item.productId, quantity: Number(quantities[index]),
        ...(item.predictionId ? { predictionId: item.predictionId } : {}),
        ...(item.cartId ? { cartId: item.cartId } : {}),
      })));
      setOrder(saved);
      onValidated?.();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Commande non enregistrée."); }
    finally { setSaving(false); }
  };

  if (order) return <div className="flex flex-col gap-lg" role="status">
    <CheckCircle size={40} aria-hidden="true" />
    <h3>{order.status.startsWith("simulated") ? "Commande préparée" : "Commande enregistrée"}</h3>
    <p>{order.status.startsWith("simulated") ? "La commande n’est pas transmise : aucun achat, message fournisseur ou mouvement de stock n’a été créé." : "À transmettre au fournisseur : aucun email n’a été envoyé et le stock n’a pas changé."}</p>
    <p>Référence : {order.id}</p>
    <Link to="/orders#to-transmit" onClick={onClose}>{order.status.startsWith("simulated") ? "Voir la commande préparée" : "Voir la commande à transmettre"}</Link>
    <Button onClick={onClose}>Fermer</Button>
  </div>;

  return <div ref={formRef} className="flex flex-col gap-lg">
    <h3><Package size={20} aria-hidden="true" /> Quantités à commander</h3>
    <p>Vérifiez les quantités et le fournisseur. La validation n’envoie rien et ne modifie pas le stock.</p>
    {recommendations.some((item) => item.predictionId) && <p role="alert">Retirez les propositions sans source enregistrée avant de valider.</p>}
    {recommendations.length === 0 && <p role="alert">Aucun article à commander.</p>}
    {!catalogLoading && !catalogError && quantities.some((value, index) => value.trim() && !validQuantity(value, index)) && <p role="alert">Respectez le pas de commande indiqué pour chaque produit (maximum : 1 000 000). Les anciennes sélections doivent être ajustées avant validation.</p>}
    {catalogLoading && <p role="status">Chargement du catalogue…</p>}
    {(catalogError || saveError) && <div role="alert"><p>{saveError || catalogError?.message}</p>
      {catalogError && <Button ref={retryButtonRef} type="button" variant="outline" disabled={catalogLoading} onClick={retryCatalog}>Réessayer</Button>}
    </div>}
    {recommendations.map((item, index) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const supplier = suppliers.find((candidate) => candidate.id === product?.supplierId);
      return <div key={`${item.id}-${index}`} className="flex flex-col gap-sm">
        <label htmlFor={`order-quantity-${index}`}>{product?.name ?? item.productName} · {supplier?.name ?? "Fournisseur indisponible"}</label>
        <small>{item.reason}</small>
        <small>{product ? `Stock enregistré : ${product.currentStock} ${product.unit} · seuil : ${product.minThreshold} ${product.unit}` : "Stock et seuil indisponibles"}</small>
        <input className="input-field" id={`order-quantity-${index}`} type="number" min={product ? getOrderStep(product) : 1} step={product ? getOrderStep(product) : 1} max={1000000} aria-invalid={!validQuantity(quantities[index], index)} aria-describedby={`order-step-${index}`} disabled={saving} value={quantities[index]} onChange={(event) => setQuantities((prev) => prev.map((value, i) => i === index ? event.target.value : value))} />
        <small id={`order-step-${index}`}>{product ? `${orderStepLabel(getOrderStep(product), product.unit)} · conditionnement fournisseur à vérifier.` : "Produit indisponible"}</small>
        <small>{product?.unit} · {((product?.pricePerUnit ?? 0) * (Number(quantities[index]) || 0)).toFixed(2)} €</small>
      </div>;
    })}
    <strong>Montant estimé : {total.toFixed(2)} €</strong>
    <div className="flex gap-sm">
      <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      <Button onClick={handleValidate} disabled={saving || catalogLoading || !!catalogError || !valid || recommendations.some((item) => item.predictionId)}>{saving ? "Enregistrement…" : "Valider la commande"}</Button>
    </div>
  </div>;
}
