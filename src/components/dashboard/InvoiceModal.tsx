import React from "react";
import Button from "../common/Button";
import { Check, FileText, AlertCircle } from "lucide-react";
import "./InvoiceModal.css";

interface InvoiceModalProps {
  onValidate: () => void;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ onValidate, onClose }) => {
  const scannedItems = [
    { name: "Tomates Rondes", qty: "12 kg", price: "28.80 €", status: "ok" },
    {
      name: "Mozzarella Di Bufala",
      qty: "5 kg",
      price: "42.50 €",
      status: "ok",
    },
    { name: "Basilic Botte", qty: "3 pcs", price: "4.50 €", status: "ok" },
    {
      name: "Huile d'Olive Extra",
      qty: "10 L",
      price: "120.00 €",
      status: "warning",
    }, // Price warning
  ];

  return (
    <div className="invoice-modal">
      <div className="invoice-summary">
        <div className="invoice-summary-icon">
          <FileText className="text-primary" size={24} />
        </div>
        <div>
          <h4 className="invoice-summary-title">
            Facture #Rungis-2024-12-09
          </h4>
          <p className="invoice-summary-subtitle">
            Détectée aujourd'hui à 08:30
          </p>
        </div>
      </div>

      <div className="scanned-list">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Produit Détecté</th>
              <th>Quantité</th>
              <th>Prix</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {scannedItems.map((item, idx) => (
              <tr key={idx}>
                <td className="invoice-product-name">{item.name}</td>
                <td>{item.qty}</td>
                <td className="invoice-price">{item.price}</td>
                <td>
                  {item.status === "ok" ? (
                    <span className="invoice-status invoice-status-ok">
                      <Check size={12} /> Confirmé
                    </span>
                  ) : (
                    <span className="invoice-status invoice-status-warning">
                      <AlertCircle size={12} /> Prix Élevé
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoice-actions">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={onValidate} icon={<Check size={16} />}>
          Valider et Mettre à jour Stock
        </Button>
      </div>
    </div>
  );
};

export default InvoiceModal;
