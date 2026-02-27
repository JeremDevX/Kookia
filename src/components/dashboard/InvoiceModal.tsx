import React from "react";
import Button from "../common/Button";
import { Check, FileText, AlertCircle } from "lucide-react";

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
    <div className="flex flex-col gap-lg">
      <div className="bg-gray-50 p-4 rounded-md border border-dashed border-gray-300 flex items-center gap-4">
        <div className="bg-white p-3 rounded-full shadow-sm">
          <FileText className="text-primary" size={24} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">
            Facture #Rungis-2024-12-09
          </h4>
          <p className="text-sm text-gray-500">Détectée aujourd'hui à 08:30</p>
        </div>
      </div>

      <div className="scanned-list border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b">
            <tr>
              <th className="p-3">Produit Détecté</th>
              <th className="p-3">Quantité</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {scannedItems.map((item, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-800">{item.name}</td>
                <td className="p-3">{item.qty}</td>
                <td className="p-3 font-mono">{item.price}</td>
                <td className="p-3">
                  {item.status === "ok" ? (
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-semibold">
                      <Check size={12} /> Confirmé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded text-xs font-semibold">
                      <AlertCircle size={12} /> Prix Élevé
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-sm mt-2">
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
