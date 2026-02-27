import React from "react";
import Button from "../common/Button";
import { Sparkles, Utensils, Printer } from "lucide-react";
import { domainBusinessConfig } from "../../config/domain/businessConfig";

interface MenuIdeasModalProps {
  onValidate: () => void;
  onClose: () => void;
}

const MenuIdeasModal: React.FC<MenuIdeasModalProps> = ({
  onValidate,
  onClose,
}) => {
  const { menuSuggestion } = domainBusinessConfig;

  return (
    <div className="flex flex-col gap-lg">
      <div className="bg-gradient-to-r from-teal-50 to-orange-50 p-6 rounded-lg text-center border border-teal-100">
        <Sparkles className="mx-auto text-moderate mb-2" size={32} />
        <h3 className="text-xl font-bold text-teal-900 mb-1">
          Suggestion du Chef IA
        </h3>
        <p className="text-teal-700 text-sm">
          {menuSuggestion.stockOptimizationText}
        </p>
      </div>

      <div className="menu-preview flex flex-col gap-4 border-l-4 border-moderate pl-6 py-2 my-2">
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Entrée
          </span>
          <p className="text-lg font-serif font-medium text-gray-900">
            {menuSuggestion.starter}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Plat
          </span>
          <p className="text-lg font-serif font-medium text-gray-900">
            {menuSuggestion.main}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Dessert
          </span>
          <p className="text-lg font-serif font-medium text-gray-900">
            {menuSuggestion.dessert}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 flex items-start gap-2">
        <Utensils size={14} className="mt-1 flex-shrink-0" />
        <p>
          Ce menu permet d'utiliser{" "}
          <strong>{menuSuggestion.reclaimedStockKg}kg de stocks</strong> qui
          arriveraient à date critique d'ici {menuSuggestion.criticalWindowHours}
          h.
        </p>
      </div>

      <div className="flex justify-end gap-sm mt-4">
        <Button variant="outline" onClick={onClose}>
          Modifier
        </Button>
        <Button onClick={onValidate} icon={<Printer size={16} />}>
          Valider et Imprimer
        </Button>
      </div>
    </div>
  );
};

export default MenuIdeasModal;
