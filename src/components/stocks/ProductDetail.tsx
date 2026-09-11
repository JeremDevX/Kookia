import React, { useState, useEffect, useEffectEvent, useRef } from "react";
import Button from "../common/Button";
import Badge from "../common/Badge";
import {
  X,
  Package,
  Truck,
  AlertTriangle,
  History,
  Phone,
  ShoppingCart,
} from "lucide-react";
import type { Product } from "../../types";
import { useToast } from "../../context/ToastContext";
import {
  getProductStatus,
  getProductStatusLabel,
} from "../../domain/inventory/product.policies";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";

import { getStockMovements, type StockMovement } from "../../services/productService";
import { useCart } from "../../context/useCart";
import "./ProductDetail.css";

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
  onAdjustStock: (productId: string, delta: number, reason?: "adjustment" | "loss") => Promise<void>;
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onClose,
  onAdjustStock,
}) => {
  const { addToast } = useToast();
  const { addToCart } = useCart();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustReason, setAdjustReason] = useState<"adjustment" | "loss">("adjustment");
  const { findSupplierByProductId } = useInventoryCatalog();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeFromKeyboard = useEffectEvent(() => onClose());
  const productId = product?.id;
  useEffect(() => {
    if (!productId) return;
    const previous = document.activeElement;
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLButtonElement>(".close-btn")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFromKeyboard();
      if (event.key !== "Tab" || !drawer) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]'));
      const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previous instanceof HTMLElement) previous.focus(); };
  }, [productId]);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    getStockMovements(productId).then((data) => { if (active) { setMovements(data); setHistoryError(""); } }, () => { if (active) setHistoryError("Historique indisponible."); });
    return () => { active = false; };
  }, [productId, product?.currentStock]);

  if (!product) return null;

  const status = getProductStatus(product);
  const supplier = findSupplierByProductId(product.id);

  const handleContactSupplier = () => {
    if (supplier?.phone) window.location.href = `tel:${supplier.phone.replace(/[^+0-9]/g, "")}`;
  };

  const handleOrderFromSupplier = async () => {
    const saved = await addToCart({ id: `product-${product.id}`, productId: product.id, productName: product.name,
      source: "stocks", quantity: Math.max(1, product.minThreshold - product.currentStock), unit: product.unit });
    if (saved) addToast("info", "Ajouté au panier", "Vérifiez et validez la commande depuis le tableau de bord.");
  };

  const handleReportLoss = () => {
    setAdjustReason("loss");
    setAdjustAmount("");
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async () => {
    if (saving) return;
    if (!showAdjustModal) { setAdjustReason("adjustment"); setShowAdjustModal(true); return; }
    const amount = Number(adjustAmount.trim().replace(",", "."));
    const delta = adjustReason === "loss" ? -Math.abs(amount) : amount;
    if (!Number.isFinite(delta) || delta === 0) {
      addToast("info", "Ajustement invalide", "Entrez une quantité non nulle (ex. +10 ou -2,5).");
      return;
    }
    setSaving(true);
    try {
      await onAdjustStock(product.id, delta, adjustReason);
      addToast("success", "Stock ajusté", `${product.name}: ${delta > 0 ? "+" : ""}${delta} ${product.unit}`);
      setShowAdjustModal(false);
      setAdjustAmount("");
    } catch (error) {
      addToast("info", "Stock non modifié", error instanceof Error ? error.message : "Réessayez.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="product-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="product-drawer-title">
        <header className="drawer-header">
          <div>
            <span className="drawer-subtitle">Détails du produit</span>
            <h2 className="drawer-title" id="product-drawer-title">{product.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Fermer les détails du produit">
            <X size={24} />
          </button>
        </header>

        <div className="drawer-content">
          <section className="drawer-section">
            <div className="status-banner">
              <Badge
                label={
                  status === "urgent"
                    ? "Rupture Imminente"
                    : status === "moderate"
                    ? "Stock Faible"
                    : getProductStatusLabel(status)
                }
                status={status}
              />
              <span className="stock-big">
                {product.currentStock}{" "}
                <span className="unit">{product.unit}</span>
              </span>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="section-heading">
              <Package size={18} /> Inventaire
            </h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Catégorie</span>
                <span className="value">{product.category}</span>
              </div>
              <div className="info-item">
                <span className="label">Seuil Min.</span>
                <span className="value">
                  {product.minThreshold} {product.unit}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Prix Unitaire</span>
                <span className="value">{product.pricePerUnit} €</span>
              </div>
              <div className="info-item">
                <span className="label">Valeur Stock</span>
                <span className="value">
                  {(product.currentStock * product.pricePerUnit).toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="section-heading">
              <Truck size={18} /> Fournisseur
            </h3>
            <div className="supplier-card">
              <div>
                <span className="supplier-name">
                  {supplier?.name || "Fournisseur"}
                </span>
                {supplier?.phone && (
                  <span className="text-xs text-secondary block mt-1">
                    {supplier.phone}
                  </span>
                )}
              </div>
              <div className="supplier-actions">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Phone size={14} />}
                  onClick={handleContactSupplier}
                >
                  Contacter
                </Button>
                <Button
                  size="sm"
                  icon={<ShoppingCart size={14} />}
                  onClick={handleOrderFromSupplier}
                >
                  Commander
                </Button>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="section-heading">
              <History size={18} /> Historique
            </h3>
            <div className="history-list">
              {historyError ? <p role="alert">{historyError}</p> : movements.length === 0 ? <p>Aucun mouvement enregistré.</p> : movements.map((movement) => (
                <div className="history-item" key={movement.id}>
                  <span className="date">{new Date(movement.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span className="action">{movement.delta > 0 ? "+" : ""}{movement.delta} {product.unit} ({movement.reason === "loss" ? "Perte" : movement.reason === "initial" ? "Stock initial" : "Ajustement"})</span>
                </div>
              ))}
            </div>
          </section>

          {showAdjustModal && (
            <section className="drawer-section">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label htmlFor="stock-adjustment" className="block text-sm font-medium mb-2">
                  {adjustReason === "loss" ? "Quantité perdue" : "Ajustement de stock (quantité signée)"}
                </label>
                <input
                  id="stock-adjustment"
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="ex: +10 ou -5"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  autoFocus
                />
              </div>
            </section>
          )}
        </div>

        <footer className="drawer-footer">
          <Button
            variant="danger"
            icon={<AlertTriangle size={16} />}
            onClick={handleReportLoss} disabled={saving}
          >
            Signaler Perte
          </Button>
          <Button variant="secondary" onClick={handleAdjustStock} disabled={saving}>
            {showAdjustModal ? "Confirmer" : "Ajuster Stock"}
          </Button>
        </footer>
      </div>
    </>
  );
};

export default ProductDetail;
