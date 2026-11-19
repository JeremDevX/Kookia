import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import type { StockFilters } from "../../types/callbacks";
import type { Supplier } from "../../types";

interface FiltersModalProps {
  onClose: () => void;
  onApply: (filters: StockFilters) => void;
  suppliers: Supplier[];
  appliedFilters: StockFilters;
}

const FiltersModal: React.FC<FiltersModalProps> = ({
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
    <Modal isOpen onClose={onClose} title="Filtrer les produits">
      <div className="flex-col gap-md">
        <div className="input-wrapper">
          <label htmlFor="filtersmodal-1" className="input-label">
            État du stock
          </label>
          <select id="filtersmodal-1"
            className="input-field"
            value={filters.status}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value as StockFilters["status"],
              })
            }
          >
            <option value="all">Tous les états</option>
            <option value="neutral">À vérifier</option>
            <option value="optimal">Bon</option>
            <option value="moderate">À surveiller</option>
            <option value="urgent">Rupture confirmée</option>
          </select>
        </div>

        <div className="input-wrapper">
          <label htmlFor="filtersmodal-2" className="input-label">Fournisseur</label>
          <select id="filtersmodal-2"
            className="input-field"
            value={filters.supplier}
            onChange={(e) =>
              setFilters({ ...filters, supplier: e.target.value })
            }
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </div>

        <div className="input-wrapper">
          <label htmlFor="filtersmodal-3" className="input-label">
            Niveau de stock
          </label>
          <select id="filtersmodal-3"
            className="input-field"
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

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={handleApply}>Afficher les résultats</Button>
        </div>
      </div>
    </Modal>
  );
};

export default FiltersModal;
