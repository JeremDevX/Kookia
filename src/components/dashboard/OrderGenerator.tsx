import { getOrderStep, orderStepLabel } from "../../../shared/orderQuantity.js";
import { consumeFocusRestoreRequest } from "../../utils/focusRestoration";
import { useEffect, useRef, useState } from "react";
import Button from "../common/Button";
import Modal from "../common/Modal";
import { CheckCircle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { createOrderRecommendationsFromCartItems } from "../../features/orders/orderRecommendations";
import type { CartItem } from "../../context/cart.types";
import { validateOrder, type PurchaseOrder } from "../../services/orderService";
import { isValidOrderQuantity } from "../../domain/orders/orderQuantity";
import type { Product, Supplier } from "../../types";

interface OrderGeneratorProps {
  initialCartItems: CartItem[];
  products: Product[];
  suppliers: Supplier[];
  catalogLoading: boolean;
  catalogError: Error | null;
  onRetryCatalog: () => void;
  onClose: () => void;
  onValidated?: () => void;
  orderHref?: string;
}

export default function OrderGenerator({ initialCartItems, products, suppliers, catalogLoading, catalogError,
  onRetryCatalog, onClose, onValidated, orderHref = "/orders#to-transmit" }: OrderGeneratorProps) {
  // A cart update can finish while the chef is reviewing this selection.
  const [draft, setDraft] = useState(() => createOrderRecommendationsFromCartItems(initialCartItems)
    .map(({ quantity, ...item }) => ({ ...item, quantityInput: String(quantity) })));
  const [operationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const retryFocusPending = useRef(false);
  const lines = draft.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const supplier = suppliers.find((candidate) => candidate.id === product?.supplierId);
    const step = product ? getOrderStep(product) : 1;
    const quantity = Number(item.quantityInput);
    return { item, product, supplier, step, quantity,
      valid: !!product && isValidOrderQuantity(item.quantityInput, step),
      estimatedCost: (product?.pricePerUnit ?? 0) * (quantity || 0),
    };
  });
  const hasExampleItem = draft.some((item) => item.predictionId);
  const canValidate = !saving && !catalogLoading && !catalogError && !hasExampleItem && lines.length > 0 && lines.every((line) => line.valid);
  const total = lines.reduce((sum, line) => sum + line.estimatedCost, 0);

  useEffect(() => {
    if (catalogLoading || !consumeFocusRestoreRequest(retryFocusPending)) return;
    if (catalogError) retryButtonRef.current?.focus();
    else formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [catalogError, catalogLoading, products]);

  const retryCatalog = () => {
    retryFocusPending.current = document.activeElement === retryButtonRef.current;
    void onRetryCatalog();
  };

  const handleValidate = async () => {
    if (!canValidate) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = await validateOrder(operationId, lines.map(({ item, quantity }) => ({
        productId: item.productId, cartId: item.cartId, quantity,
      })));
      setOrder(saved);
      onValidated?.();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Commande non enregistrée."); }
    finally { setSaving(false); }
  };

  return <Modal isOpen onClose={onClose} closeDisabled={saving} title="Vérifier ma commande" width="lg">{order ? <div className="flex flex-col gap-lg" role="status">
    <CheckCircle size={40} aria-hidden="true" />
    <h3>{order.status.startsWith("simulated") ? "Commande préparée" : "Commande enregistrée"}</h3>
    <p>{order.status.startsWith("simulated") ? "La commande n’est pas transmise : aucun achat, message fournisseur ou mouvement de stock n’a été créé." : "À transmettre au fournisseur : aucun email n’a été envoyé et le stock n’a pas changé."}</p>
    <p>Référence : {order.id}</p>
    <Link to={orderHref} onClick={onClose}>{order.status.startsWith("simulated") ? "Voir la commande préparée" : "Voir la commande à transmettre"}</Link>
    <Button onClick={onClose}>Fermer</Button>
  </div> : <div ref={formRef} className="flex flex-col gap-lg">
    <h3><Package size={20} aria-hidden="true" /> Quantités à commander</h3>
    <p>Vérifiez les quantités et le fournisseur. La validation n’envoie rien et ne modifie pas le stock.</p>
    {hasExampleItem && <p role="alert">Retirez les propositions sans source enregistrée avant de valider.</p>}
    {lines.length === 0 && <p role="alert">Aucun article à commander.</p>}
    {!catalogLoading && !catalogError && lines.some(({ item, valid }) => item.quantityInput.trim() && !valid) && <p role="alert">Respectez le pas de commande indiqué pour chaque produit (maximum : 1 000 000). Les anciennes sélections doivent être ajustées avant validation.</p>}
    {catalogLoading && <p role="status">Chargement du catalogue…</p>}
    {(catalogError || saveError) && <div role="alert"><p>{saveError || catalogError?.message}</p>
      {catalogError && <Button ref={retryButtonRef} type="button" variant="outline" disabled={catalogLoading} onClick={retryCatalog}>Réessayer</Button>}
    </div>}
    {lines.map(({ item, product, supplier, step, valid, estimatedCost }, index) => (
      <div key={item.cartId} className="flex flex-col gap-sm">
        <label htmlFor={`order-quantity-${index}`}>{product?.name ?? item.productName} · {supplier?.name ?? "Fournisseur indisponible"}</label>
        <small>{item.reason}</small>
        <small>{product ? `Stock enregistré : ${product.currentStock} ${product.unit} · seuil : ${product.minThreshold} ${product.unit}` : "Stock et seuil indisponibles"}</small>
        <input className="input-field" id={`order-quantity-${index}`} type="number" min={step} step={step} max={1000000} aria-invalid={!valid} aria-describedby={`order-step-${index}`} disabled={saving} value={item.quantityInput} onChange={(event) => {
          const quantityInput = event.target.value;
          setDraft((current) => current.map((line) => line.cartId === item.cartId ? { ...line, quantityInput } : line));
        }} />
        <small id={`order-step-${index}`}>{product ? `${orderStepLabel(step, product.unit)} · conditionnement fournisseur à vérifier.` : "Produit indisponible"}</small>
        <small>{product?.unit} · {estimatedCost.toFixed(2)} €</small>
      </div>
    ))}
    <strong>Montant estimé : {total.toFixed(2)} €</strong>
    <div className="flex gap-sm">
      <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      <Button onClick={handleValidate} disabled={!canValidate}>{saving ? "Enregistrement…" : "Valider la commande"}</Button>
    </div>
  </div>}</Modal>;
}
