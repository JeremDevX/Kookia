import React, { useState } from "react";
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
import { getStatus, type Product, MOCK_SUPPLIERS } from "../../utils/mockData";
import { useToast } from "../../context/ToastContext";

import "./ProductDetail.css";

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onClose }) => {
  const { addToast } = useToast();
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");

  if (!product) return null;

  const status = getStatus(product);
  const supplier = MOCK_SUPPLIERS.find((s) => s.id === product.supplierId);

  const handleContactSupplier = () => {
    addToast(
      "success",
      "Appel en cours",
      `Connexion avec ${supplier?.name || "le fournisseur"}...`
    );
  };

  const handleOrderFromSupplier = () => {
    addToast(
      "success",
      "Commande créée",
      `Commande de ${product.name} envoyée à ${
        supplier?.name || "le fournisseur"
      }.`
    );
  };

  const handleReportLoss = () => {
    addToast(
      "info",
      "Perte signalée",
      `Incident enregistré pour ${product.name}. L'IA ajustera les prévisions.`
    );
  };

  const handleAdjustStock = () => {
    if (adjustAmount && !isNaN(Number(adjustAmount))) {
      addToast(
        "success",
        "Stock ajusté",
        `${product.name}: ${adjustAmount > "0" ? "+" : ""}${adjustAmount} ${
          product.unit
        }`
      );
      setShowAdjustModal(false);
      setAdjustAmount("");
    } else {
      setShowAdjustModal(true);
    }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="product-drawer">
        <header className="drawer-header">
          <div>
            <span className="drawer-subtitle">Détails du produit</span>
            <h2 className="drawer-title">{product.name}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
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
                    : "Stock Optimal"
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
              <div className="history-item">
                <span className="date">07 Dec</span>
                <span className="action">-2.5 kg (Service Midi)</span>
              </div>
              <div className="history-item">
                <span className="date">06 Dec</span>
                <span className="action">+10 kg (Livraison)</span>
              </div>
              <div className="history-item">
                <span className="date">05 Dec</span>
                <span className="action">-3.2 kg (Service Soir)</span>
              </div>
            </div>
          </section>

          {showAdjustModal && (
            <section className="drawer-section">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium mb-2">
                  Ajustement de stock (utilisez + ou - pour indiquer)
                </label>
                <input
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
            onClick={handleReportLoss}
          >
            Signaler Perte
          </Button>
          <Button variant="secondary" onClick={handleAdjustStock}>
            {showAdjustModal ? "Confirmer" : "Ajuster Stock"}
          </Button>
        </footer>
      </div>
    </>
  );
};

export default ProductDetail;
