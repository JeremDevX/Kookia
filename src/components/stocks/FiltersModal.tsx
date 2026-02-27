import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Filter } from "lucide-react";
import type { StockFilters } from "../../types/callbacks";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: StockFilters) => void;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const [filters, setFilters] = useState<StockFilters>({
    status: "all",
    supplier: "all",
    stockLevel: "all",
  });

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: StockFilters = {
      status: "all",
      supplier: "all",
      stockLevel: "all",
    };
    setFilters(resetFilters);
    onApply(resetFilters);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filtres avancés" width="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            État du stock
          </label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as StockFilters["status"],
              })
            }
          >
            <option value="all">Tous les états</option>
            <option value="optimal">Optimal</option>
            <option value="moderate">Moyen</option>
            <option value="urgent">Critique</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fournisseur</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={filters.supplier}
            onChange={(e) =>
              setFilters({ ...filters, supplier: e.target.value })
            }
          >
            <option value="all">Tous les fournisseurs</option>
            <option value="sup1">Franck Légumes</option>
            <option value="sup2">Fromages Dupont</option>
            <option value="sup3">Avicole MM</option>
            <option value="sup4">Viandes de Rungis</option>
            <option value="sup5">Bio Local IDF</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Niveau de stock
          </label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={filters.stockLevel}
            onChange={(e) =>
              setFilters({
                ...filters,
                stockLevel: e.target.value as StockFilters["stockLevel"],
              })
            }
          >
            <option value="all">Tous les niveaux</option>
            <option value="low">Stock bas (&lt; seuil)</option>
            <option value="medium">Stock moyen</option>
            <option value="high">Stock élevé</option>
          </select>
        </div>

        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
          <Filter size={16} className="inline mr-2" />
          Les filtres s'appliquent en temps réel sur votre inventaire.
        </div>

        <div className="flex justify-between gap-3 mt-4">
          <Button variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleApply}>Appliquer les filtres</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FiltersModal;
