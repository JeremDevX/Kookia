import React, { useState, useRef } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import {
  X,
  Package,
  Truck,
  AlertTriangle,
  Phone,
  ShoppingCart,
  Pencil,
} from "lucide-react";
import type { Product, Supplier } from "../../types";
import { getSuggestedOrderQuantity } from "../../domain/inventory/product.policies";
import type { NewStockCount, ProductEdit, StockCountResult, StockAdjustment } from "../../services/productService";
import { useDialogFocus } from "../common/useDialogFocus";
import { useProductAdjustment } from "./useProductAdjustment";
import { useProductHistory } from "./useProductHistory";
import ProductMovementHistory from "./ProductMovementHistory";
import EditProductModal from "./EditProductModal";
import StockCountModal from "./StockCountModal";
import StockVerificationSummary from "./StockVerificationSummary";
import StockCountHistory from "./StockCountHistory";
import { useCart } from "../../context/useCart";
import { Link, useNavigate } from "react-router-dom";
import "./ProductDetail.css";

interface ProductDetailProps {
  product: Product;
  focusedMovementId: string | null;
  returnHref?: string;
  onClose: () => void;
  onAdjustStock: (productId: string, input: StockAdjustment, restaurantId: string) => Promise<void>;
  onUpdateProduct: (productId: string, edit: ProductEdit) => Promise<Product>;
  onRecordCount: (productId: string, count: NewStockCount) => Promise<StockCountResult>;
  onRefresh: () => Promise<boolean>;
  suppliers: Supplier[];
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  focusedMovementId,
  returnHref,
  onClose,
  onAdjustStock,
  onUpdateProduct,
  onRecordCount,
  onRefresh,
  suppliers,
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [childDialog, setChildDialog] = useState<"edit" | "count" | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogFocus(drawerRef, true, onClose);

  const { movements, movementsLoaded, historyError, reloadMovements, stockCounts, countHistoryError, recordCount } =
    useProductHistory(product, onRecordCount);
  const { pendingAdjustment, adjustmentError, adjustReason, adjustAmount, setAdjustAmount, reportLoss, adjustStock, adjustmentDisabled } =
    useProductAdjustment(product, onAdjustStock, onRefresh);
  const supplier = suppliers.find((item) => item.id === product.supplierId);

  const handleContactSupplier = () => {
    if (supplier?.phone) window.location.href = `tel:${supplier.phone.replace(/[^+0-9]/g, "")}`;
  };

  const handleOrderFromSupplier = async () => {
    const saved = await addToCart({ id: `product-${product.id}`, productId: product.id, productName: product.name,
      source: "stocks", quantity: getSuggestedOrderQuantity(product), unit: product.unit });
    if (saved) { onClose(); navigate("/orders#selection"); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="product-drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="product-drawer-title" tabIndex={-1}>
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
          <StockVerificationSummary product={product} onCount={() => setChildDialog("count")} />

          <section className="drawer-section">
            <h3 className="section-heading">Recettes avec ce produit</h3>
            <p>Consultez les recettes contenant cet ingrédient et celles réalisables avec le stock enregistré. Aucun surstock n'est déduit automatiquement.</p>
            <Link to={`/recipes?product=${encodeURIComponent(product.id)}`} onClick={onClose}>Voir les recettes avec {product.name}</Link>
          </section>

          <section className="drawer-section">
            <div className="flex items-center justify-between gap-sm"><h3 className="section-heading">
              <Package size={18} /> Quantités et prix
            </h3><Button size="sm" variant="outline" icon={<Pencil size={14} />} onClick={() => setChildDialog("edit")}>Modifier la fiche</Button></div>
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
                <span className="label">Valeur indicative du stock théorique : estimation selon le prix catalogue, dont la base fiscale et la provenance ne sont pas précisées</span>
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
                  <small className="drawer-source">
                    {supplier.phone}
                  </small>
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

          {pendingAdjustment && <p role="alert">Un ajustement de {pendingAdjustment.delta} {pendingAdjustment.expectedUnit} ({pendingAdjustment.reason === "loss" ? "perte" : "correction"}) reste à vérifier. Reprenez-le avant toute nouvelle saisie.</p>}
          {adjustmentError && <p role="alert">{adjustmentError}</p>}
          {adjustReason && !pendingAdjustment && (
            <section className="drawer-section">
              <p role="status">Motif : {adjustReason === "loss" ? "perte déclarée" : "correction d'inventaire"}. Ce mouvement sera enregistré dans l'historique.</p>
              <Input id="stock-adjustment" type="text" inputMode="decimal"
                label={adjustReason === "loss" ? `Quantité perdue (${product.unit})` : `Variation du stock (${product.unit})`}
                placeholder={adjustReason === "loss" ? "Ex. : 2,5" : "Ex. : +10 ou -5"}
                value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} autoFocus />
            </section>
          )}

          <ProductMovementHistory unit={product.unit} focusedMovementId={focusedMovementId} returnHref={returnHref}
            movements={movements} movementsLoaded={movementsLoaded} historyError={historyError} onRetry={reloadMovements} />
        </div>

        <footer className="drawer-footer">
          <Button
            variant="danger"
            icon={<AlertTriangle size={16} />}
            onClick={reportLoss} disabled={adjustmentDisabled || !!pendingAdjustment}
          >
            Signaler une perte
          </Button>
          <Button variant="secondary" onClick={adjustStock} disabled={adjustmentDisabled}>
            {pendingAdjustment ? "Vérifier l’ajustement" : adjustReason ? "Enregistrer l’ajustement" : "Ajuster le stock"}
          </Button>
        </footer>
      </div>
      <EditProductModal product={product} suppliers={suppliers} isOpen={childDialog === "edit"} onClose={() => setChildDialog(null)} onSave={onUpdateProduct} />
      <StockCountModal product={product} isOpen={childDialog === "count"} onClose={() => setChildDialog(null)} onRefresh={onRefresh} onSave={recordCount} />
    </>
  );
};

export default ProductDetail;
