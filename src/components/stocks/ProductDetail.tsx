import React, { useState, useEffect, useEffectEvent, useRef } from "react";
import Button from "../common/Button";
import {
  X,
  Package,
  Truck,
  AlertTriangle,
  History,
  Phone,
  ShoppingCart,
  Pencil,
} from "lucide-react";
import type { Product, StockCountSummary, Supplier } from "../../types";
import { useToast } from "../../context/ToastContext";
import { getSuggestedOrderQuantity } from "../../domain/inventory/product.policies";

import { getProductStockCounts, getStockMovements, type StockMovement, type NewStockCount, type ProductEdit, type StockCountResult } from "../../services/productService";
import EditProductModal from "./EditProductModal";
import StockCountModal from "./StockCountModal";
import StockVerificationSummary from "./StockVerificationSummary";
import StockCountHistory from "./StockCountHistory";
import { useCart } from "../../context/useCart";
import { Link, useNavigate } from "react-router-dom";
import "./ProductDetail.css";

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
  onAdjustStock: (productId: string, delta: number, reason?: "adjustment" | "loss") => Promise<void>;
  onUpdateProduct: (productId: string, edit: ProductEdit) => Promise<Product>;
  onRecordCount: (productId: string, count: NewStockCount) => Promise<StockCountResult>;
  onRefresh: () => Promise<void>;
  suppliers: Supplier[];
}

const movementLabel = (reason: string) => ({
  loss: "Perte", initial: "Stock initial", receipt: "Réception",
  invoice_import_demo: "Entrée de facture simulée", simulated_consumption: "Sortie simulée",
  simulated_unit_rounding: "Correction d’unité simulée", simulation_opening: "Stock de départ simulé",
  simulation_restock: "Réapprovisionnement simulé", simulation_loss: "Perte simulée (hypothèse)",
  production: "Production", stock_count: "Écart de comptage",
}[reason] ?? "Ajustement");

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onClose,
  onAdjustStock,
  onUpdateProduct,
  onRecordCount,
  onRefresh,
  suppliers,
}) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCountSummary[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [countHistoryError, setCountHistoryError] = useState("");
  const [saving, setSaving] = useState(false);
  const [adjustReason, setAdjustReason] = useState<"adjustment" | "loss">("adjustment");
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeFromKeyboard = useEffectEvent(() => {
    if (!showEditModal && !showCountModal) onClose();
  });
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

  useEffect(() => {
    if (!productId) return;
    let active = true;
    getProductStockCounts(productId).then((data) => { if (active) { setStockCounts(data); setCountHistoryError(""); } }, () => { if (active) setCountHistoryError("Historique des comptages indisponible."); });
    return () => { active = false; };
  }, [productId, product?.stockRevision]);

  if (!product) return null;

  const supplier = suppliers.find((item) => item.id === product.supplierId);

  const handleRecordCount = async (productId: string, count: NewStockCount) => {
    const result = await onRecordCount(productId, count);
    setStockCounts((previous) => [result.count, ...previous.filter((item) => item.id !== result.count.id)]);
    return result;
  };

  const handleContactSupplier = () => {
    if (supplier?.phone) window.location.href = `tel:${supplier.phone.replace(/[^+0-9]/g, "")}`;
  };

  const handleOrderFromSupplier = async () => {
    const saved = await addToCart({ id: `product-${product.id}`, productId: product.id, productName: product.name,
      source: "stocks", quantity: getSuggestedOrderQuantity(product), unit: product.unit });
    if (saved) { onClose(); navigate("/orders#selection"); }
  };

  const handleReportLoss = () => {
    setAdjustReason("loss");
    setAdjustAmount("");
    setShowAdjustModal(true);
  };

  const handleAdjustStock = async () => {
    if (saving) return;
    if (!showAdjustModal) { setAdjustReason("adjustment"); setShowAdjustModal(true); return; }
    const normalizedAmount = adjustAmount.trim().replace(",", ".");
    const amount = Number(normalizedAmount);
    const delta = adjustReason === "loss" ? -Math.abs(amount) : amount;
    if (!/^[+-]?(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(normalizedAmount) || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1_000_000) {
      addToast("info", "Ajustement invalide", "Entrez une quantité non nulle, de 3 décimales au maximum (ex. +10 ou -2,5).");
      return;
    }
    if (product.currentStock + delta < 0) {
      addToast("info", "Ajustement invalide", "La quantité retirée dépasse le stock disponible.");
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
            <span className="drawer-subtitle">Stock et mouvements</span>
            <h2 className="drawer-title" id="product-drawer-title">{product.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Fermer les détails du produit">
            <X size={24} />
          </button>
        </header>

        <div className="drawer-content">
          <StockVerificationSummary product={product} onCount={() => setShowCountModal(true)} />

          <section className="drawer-section">
            <h3 className="section-heading">Recettes avec ce produit</h3>
            <p>Consultez les recettes contenant cet ingrédient et celles réalisables avec le stock enregistré. Aucun surstock n'est déduit automatiquement.</p>
            <Link to={`/recipes?product=${encodeURIComponent(product.id)}`} onClick={onClose}>Voir les recettes avec {product.name}</Link>
          </section>

          <section className="drawer-section">
            <div className="flex items-center justify-between gap-3"><h3 className="section-heading">
              <Package size={18} /> Quantités et prix
            </h3><Button size="sm" variant="outline" icon={<Pencil size={14} />} onClick={() => setShowEditModal(true)}>Modifier la fiche</Button></div>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Catégorie</span>
                <span className="value">{product.category}</span>
              </div>
              <div className="info-item">
                <span className="label">Seuil d’alerte</span>
                <span className="value">
                  {product.minThreshold} {product.unit}
                </span>
              </div>
              <div className="info-item">
                <span className="label">Prix unitaire</span>
                <span className="value">{product.pricePerUnit} €</span>
              </div>
              <div className="info-item">
                <span className="label">Valeur du stock</span>
                <span className="value">
                  {(product.currentStock * product.pricePerUnit).toFixed(2)} €
                </span>
              </div>
            </div>
          </section>

          <StockCountHistory counts={stockCounts} error={countHistoryError} />

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
                  onClick={handleContactSupplier} disabled={!supplier?.phone}
                >
                  Contacter
                </Button>
                <Button
                  size="sm"
                  icon={<ShoppingCart size={14} />}
                  onClick={handleOrderFromSupplier}
                >
                  Ajouter à la commande
                </Button>
              </div>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="section-heading">
              <History size={18} /> Mouvements de stock
            </h3>
            <div className="history-list">
              {historyError ? <p role="alert">{historyError}</p> : movements.length === 0 ? <p>Aucun mouvement enregistré.</p> : movements.map((movement) => (
                <div className="history-item" key={movement.id}>
                  <span className="date">{new Date(movement.createdAt).toLocaleDateString("fr-FR")}</span>
                  <span className="action">{movement.delta > 0 ? "+" : ""}{movement.delta} {product.unit} ({movementLabel(movement.reason)})</span>
                  {movement.sourceDocumentId && <Link to={`/orders?source=${encodeURIComponent(movement.sourceDocumentId)}#invoices`}>Ouvrir la pièce source</Link>}
                </div>
              ))}
            </div>
          </section>

          {showAdjustModal && (
            <section className="drawer-section">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p role="status">Motif : {adjustReason === "loss" ? "perte déclarée" : "correction d'inventaire"}. Ce mouvement sera enregistré dans l'historique.</p>
                <label htmlFor="stock-adjustment" className="block text-sm font-medium mb-2">
                  {adjustReason === "loss" ? `Quantité perdue (${product.unit})` : `Variation du stock (${product.unit})`}
                </label>
                <input
                  id="stock-adjustment"
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ex. : +10 ou -5"
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
            Signaler une perte
          </Button>
          <Button variant="secondary" onClick={handleAdjustStock} disabled={saving}>
            {showAdjustModal ? "Enregistrer l’ajustement" : "Ajuster le stock"}
          </Button>
        </footer>
      </div>
      <EditProductModal product={product} suppliers={suppliers} isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={onUpdateProduct} />
      <StockCountModal product={product} isOpen={showCountModal} onClose={() => setShowCountModal(false)} onRefresh={onRefresh} onSave={handleRecordCount} />
    </>
  );
};

export default ProductDetail;
