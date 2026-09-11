import React, { useState } from "react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ProductDetail from "../components/stocks/ProductDetail";
import AddProductModal from "../components/stocks/AddProductModal";
import FiltersModal from "../components/stocks/FiltersModal";
import { Search, Filter, Plus, ShoppingCart } from "lucide-react";
import { useProductsWithMutations } from "../hooks";
import { useToast } from "../context/ToastContext";
import type { Product } from "../types";
import type { StockFilters } from "../types/callbacks";
import "./Stocks.css";
import "../styles/Workspace.css";

const Stocks: React.FC = () => {
  const { addToast } = useToast();
  const { products, updateStock, addProduct, getStatus } =
    useProductsWithMutations();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<StockFilters>({
    status: "all",
    supplier: "all",
    stockLevel: "all",
  });
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;

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
    updateStock(id, amount);
  };

  const handleDrawerAdjustStock = (productId: string, delta: number) => {
    updateStock(productId, delta);
  };

  const handleAddProduct = (newProduct: Product) => {
    addProduct(newProduct);
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
    <div className="stocks-container workspace-page">
      <header className="workspace-header">
        <div>
          <p className="workspace-eyebrow">VOTRE RÉSERVE, SOUS CONTRÔLE</p>
          <h1>Les bons produits. Au bon moment.</h1>
          <p className="workspace-subtitle">Consultez vos stocks, repérez les besoins et ajustez les quantités.</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Ajouter un produit
        </Button>
      </header>

      <div className="workspace-summary"><div><span>Votre inventaire</span><strong>{products.length} produits</strong></div><p>Un stock à jour, c’est le premier ingrédient d’une cuisine bien préparée.</p></div>

      <Card className="stocks-toolbar">
        <div className="toolbar-content">
          <div className="search-wrapper">
            <Input
              id="stock-search"
              label="Rechercher dans les stocks"
              placeholder="Rechercher un produit..."
              icon={<Search size={18} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filters-wrapper">
            <label className="workspace-filter-label" htmlFor="stock-category">Catégorie
            <select
              id="stock-category"
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
            </label>
            <Button
              variant="outline"
              icon={<Filter size={18} />}
              onClick={() => setIsFiltersModalOpen(true)}
            >
              Filtres
            </Button>
          </div>
        </div>
      </Card>

      <div className="workspace-section-heading"><h2>Les produits</h2><span role="status">{filteredProducts.length} résultat{filteredProducts.length > 1 ? "s" : ""}</span></div>
      <div className="stocks-table-card" role="region" aria-label="Inventaire des produits" tabIndex={0}>
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
                  onClick={() => setSelectedProductId(product.id)}
                  className="clickable-row"
                >
                  <td>
                    <button className="product-name stock-product-link" onClick={() => setSelectedProductId(product.id)}>{product.name}</button>
                  </td>
                  <td className="text-secondary">{product.category}</td>
                  <td>
                    <span className="stock-value">{product.currentStock}</span>{" "}
                    <span className="unit">{product.unit}</span>
                  </td>
                  <td className="stock-price-cell">
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
                          aria-label={`Retirer une unité de ${product.name}`}
                          onClick={(e) => handleAdjustStock(e, product.id, -1)}
                        >
                          -
                        </button>
                        <button
                          className="stock-action-btn plus"
                          aria-label={`Ajouter une unité de ${product.name}`}
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
            {filteredProducts.length === 0 && <tr><td colSpan={6}><div className="workspace-empty">Aucun produit ne correspond à votre recherche. Essayez d’autres filtres.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <ProductDetail
        product={selectedProduct}
        onClose={() => setSelectedProductId(null)}
        onAdjustStock={handleDrawerAdjustStock}
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
