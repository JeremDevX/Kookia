import React, { useState } from "react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ProductDetail from "../components/stocks/ProductDetail";
import AddProductModal from "../components/stocks/AddProductModal";
import FiltersModal from "../components/stocks/FiltersModal";
import { Search, Filter, Plus, ShoppingCart } from "lucide-react";
import { MOCK_PRODUCTS, getStatus, type Product } from "../utils/mockData";
import { useToast } from "../context/ToastContext";
import type { StockFilters } from "../types/callbacks";
import "./Stocks.css";

const Stocks: React.FC = () => {
  const { addToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<StockFilters>({
    status: "all",
    supplier: "all",
    stockLevel: "all",
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || p.category === categoryFilter;

    // Advanced filters
    const status = getStatus(p);
    const matchesStatus =
      advancedFilters.status === "all" || status === advancedFilters.status;
    const matchesSupplier =
      advancedFilters.supplier === "all" ||
      p.supplierId === advancedFilters.supplier;

    let matchesStockLevel = true;
    if (advancedFilters.stockLevel === "low") {
      matchesStockLevel = p.currentStock < p.minThreshold;
    } else if (advancedFilters.stockLevel === "medium") {
      matchesStockLevel =
        p.currentStock >= p.minThreshold && p.currentStock < p.minThreshold * 2;
    } else if (advancedFilters.stockLevel === "high") {
      matchesStockLevel = p.currentStock >= p.minThreshold * 2;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesSupplier &&
      matchesStockLevel
    );
  });

  const handleAdjustStock = (
    e: React.MouseEvent,
    id: string,
    amount: number
  ) => {
    e.stopPropagation();
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, currentStock: Math.max(0, p.currentStock + amount) }
          : p
      )
    );
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts((prev) => [...prev, newProduct]);
    addToast(
      "success",
      "Produit ajouté",
      `${newProduct.name} a été ajouté à votre inventaire.`
    );
  };

  const handleApplyFilters = (filters: StockFilters) => {
    setAdvancedFilters(filters);
    const activeFiltersCount = Object.values(filters).filter(
      (v) => v !== "all"
    ).length;
    if (activeFiltersCount > 0) {
      addToast(
        "success",
        "Filtres appliqués",
        `${activeFiltersCount} filtre(s) actif(s)`
      );
    }
  };

  return (
    <div className="stocks-container">
      <header className="page-header glass-header">
        <div>
          <h1 className="page-title">Gestion des Stocks</h1>
          <p className="page-subtitle">Inventaire en temps réel et alertes</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Ajouter un produit
        </Button>
      </header>

      <Card className="stocks-toolbar">
        <div className="toolbar-content">
          <div className="search-wrapper">
            <Input
              placeholder="Rechercher un produit..."
              icon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters-wrapper">
            <select
              className="category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              <option value="Légumes">Légumes</option>
              <option value="Fromages">Fromages</option>
              <option value="Frais">Frais</option>
              <option value="Viandes">Viandes</option>
              <option value="Epicerie">Epicerie</option>
              <option value="Charcuterie">Charcuterie</option>
            </select>
            <Button
              variant="outline"
              icon={<Filter size={18} />}
              onClick={() => setIsFiltersModalOpen(true)}
            >
              Filtres
            </Button>
            <Button
              icon={<Plus size={18} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Nouveau Produit
            </Button>
          </div>
        </div>
      </Card>

      <div className="stocks-table-card rounded-lg overflow-hidden border border-[var(--color-border)] shadow-sm">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Stock</th>
              <th>Valeur</th>
              <th>État</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const status = getStatus(product);
              return (
                <tr
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="clickable-row"
                >
                  <td>
                    <span className="product-name">{product.name}</span>
                  </td>
                  <td className="text-secondary">{product.category}</td>
                  <td>
                    <span className="stock-value">{product.currentStock}</span>{" "}
                    <span className="unit">{product.unit}</span>
                  </td>
                  <td className="font-mono text-sm">
                    {(product.currentStock * product.pricePerUnit).toFixed(2)}€
                  </td>
                  <td>
                    <Badge
                      label={
                        status === "optimal"
                          ? "Bon"
                          : status === "moderate"
                          ? "Moyen"
                          : "Critique"
                      }
                      status={status}
                    />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="actions-cell">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<ShoppingCart size={14} />}
                        onClick={() =>
                          addToast(
                            "success",
                            "Ajouté au panier",
                            `${product.name} ajouté à la commande Rungis.`
                          )
                        }
                      >
                        Commander
                      </Button>
                      <div className="stock-adjust">
                        <button
                          className="stock-action-btn minus"
                          onClick={(e) => handleAdjustStock(e, product.id, -1)}
                        >
                          -
                        </button>
                        <button
                          className="stock-action-btn plus"
                          onClick={(e) => handleAdjustStock(e, product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ProductDetail
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
      />

      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        onApply={handleApplyFilters}
      />
    </div>
  );
};

export default Stocks;
