import { useState } from "react";
import Button from "../common/Button";
import { CheckCircle, Package } from "lucide-react";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import type { OrderRecommendation } from "../../features/orders/orderRecommendations";
import { validateOrder, type PurchaseOrder } from "../../services/orderService";

interface OrderGeneratorProps {
  recommendations: OrderRecommendation[];
  onClose: () => void;
  onValidated?: () => void;
}

const isValidOrderQuantity = (value: string): boolean => {
  const quantity = Number(value);
  return /^\d+(?:\.\d{1,3})?$/.test(value.trim()) && Number.isFinite(quantity) && quantity > 0 && quantity <= 1_000_000;
};

export default function OrderGenerator({ recommendations, onClose, onValidated }: OrderGeneratorProps) {
  const { products, suppliers, loading, error } = useInventoryCatalog();
  const [quantities, setQuantities] = useState(() => recommendations.map((item) => String(item.quantity)));
  const [operationId] = useState(() => crypto.randomUUID());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const valid = recommendations.length > 0 && quantities.every(isValidOrderQuantity);
  const total = recommendations.reduce((sum, item, index) => sum + (products.find((product) => product.id === item.productId)?.pricePerUnit ?? 0) * (Number(quantities[index]) || 0), 0);

  const handleValidate = async () => {
    if (saving || !valid) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = await validateOrder(operationId, recommendations.map((item, index) => ({
        productId: item.productId, quantity: Number(quantities[index]),
        ...(item.source === "prediction" ? { predictionId: item.id } : item.predictionId ? { predictionId: item.predictionId } : {}),
        ...(item.cartId ? { cartId: item.cartId } : {}),
      })));
      setOrder(saved);
      onValidated?.();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Commande non enregistrée."); }
    finally { setSaving(false); }
  };

  if (order) return <div className="flex flex-col gap-lg" role="status">
    <CheckCircle size={40} aria-hidden="true" />
    <h3>Commande enregistrée</h3>
    <p>Votre validation et les quantités ont été enregistrées. Aucun email n’a été envoyé : cette commande reste à transmettre à vos fournisseurs.</p>
    <p>Référence : {order.id}</p>
    <Button onClick={onClose}>Fermer</Button>
  </div>;

  return <div className="flex flex-col gap-lg">
    <h3><Package size={20} aria-hidden="true" /> Revoir les quantités</h3>
    <p>Ajustez les suggestions puis validez. L’enregistrement ne déclenche aucun envoi externe et ne modifie pas le stock.</p>
    {recommendations.length === 0 && <p role="alert">Cette suggestion n’est plus disponible pour une commande.</p>}
    {quantities.some((value) => value.trim() && !isValidOrderQuantity(value)) && <p role="alert">Chaque quantité doit être comprise entre 0,001 et 1 000 000, avec au plus 3 décimales.</p>}
    {loading && <p role="status">Chargement du catalogue…</p>}
    {(error || saveError) && <p role="alert">{saveError || error?.message}</p>}
    {recommendations.map((item, index) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      const supplier = suppliers.find((candidate) => candidate.id === product?.supplierId);
      return <div key={`${item.id}-${index}`} className="flex flex-col gap-sm">
        <label htmlFor={`order-quantity-${index}`}>{product?.name ?? item.productName} · {supplier?.name ?? "Fournisseur indisponible"}</label>
        <input className="input-field" id={`order-quantity-${index}`} type="number" min="0.001" step="0.001" disabled={saving} value={quantities[index]} onChange={(event) => setQuantities((prev) => prev.map((value, i) => i === index ? event.target.value : value))} />
        <small>{product?.unit} · {((product?.pricePerUnit ?? 0) * (Number(quantities[index]) || 0)).toFixed(2)} €</small>
      </div>;
    })}
    <strong>Total estimé : {total.toFixed(2)} €</strong>
    <div className="flex gap-sm">
      <Button variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
      <Button onClick={handleValidate} disabled={saving || loading || !!error || !valid}>{saving ? "Enregistrement…" : "Valider la commande"}</Button>
    </div>
  </div>;
}
