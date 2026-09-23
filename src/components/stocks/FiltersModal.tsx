import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import type { StockFilters } from "../../types/callbacks";
import type { Supplier } from "../../types";

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: StockFilters) => void;
  suppliers: Supplier[];
  appliedFilters: StockFilters;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  onApply,
  suppliers,
  appliedFilters,
}) => {
  const [filters, setFilters] = useState<StockFilters>(appliedFilters);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Filtrer les produits" width="md">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="filtersmodal-1" className="block text-sm font-medium mb-2">
            État du stock
          </label>
          <select id="filtersmodal-1"
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
            <option value="optimal">Bon</option>
            <option value="moderate">À surveiller</option>
            <option value="urgent">Critique</option>
          </select>
        </div>

        <div>
          <label htmlFor="filtersmodal-2" className="block text-sm font-medium mb-2">Fournisseur</label>
          <select id="filtersmodal-2"
            className="w-full px-3 py-2 border rounded-md"
            value={filters.supplier}
            onChange={(e) =>
              setFilters({ ...filters, supplier: e.target.value })
            }
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="filtersmodal-3" className="block text-sm font-medium mb-2">
            Niveau de stock
          </label>
          <select id="filtersmodal-3"
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
            <option value="low">Stock bas (≤ seuil)</option>
            <option value="medium">Stock moyen (&gt; seuil et &lt; 2× seuil)</option>
            <option value="high">Stock élevé (≥ 2× seuil)</option>
          </select>
        </div>

        <div className="flex justify-between gap-3 mt-4">
          <Button variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleApply}>Afficher les résultats</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FiltersModal;
