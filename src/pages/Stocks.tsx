import React, { useState } from "react";
import Card from "../components/common/Card";
import Badge from "../components/common/Badge";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ProductDetail from "../components/stocks/ProductDetail";
import AddProductModal from "../components/stocks/AddProductModal";
import FiltersModal from "../components/stocks/FiltersModal";
import StockReview from "../components/stocks/StockReview";
import { Search, Filter, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductsWithMutations } from "../hooks";
import { useCart } from "../context/useCart";
import { useToast } from "../context/ToastContext";
import type { Product } from "../types";
import type { StockFilters } from "../types/callbacks";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import { getSuggestedOrderQuantity } from "../domain/inventory/product.policies";
import "./Stocks.css";
import "../styles/Workspace.css";

const Stocks: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { products, updateStock, addProduct, getStatus, loading, error, refetch } =
    useProductsWithMutations();
  const { suppliers } = useInventoryCatalog();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState<"review" | "all">("review");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<StockFilters>({
    status: "all",
    supplier: "all",
    stockLevel: "all",
  });
  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? null;
  const categories = Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b, "fr"));
  const productsToReview = products.filter((product) => getStatus(product) !== "optimal");

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
      matchesStockLevel = p.currentStock <= p.minThreshold;
    } else if (advancedFilters.stockLevel === "medium") {
      matchesStockLevel =
        p.currentStock > p.minThreshold && p.currentStock < p.minThreshold * 2;
    } else if (advancedFilters.stockLevel === "high") {
      matchesStockLevel = p.currentStock > p.minThreshold && p.currentStock >= p.minThreshold * 2;
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesStatus &&
      matchesSupplier &&
      matchesStockLevel
    );
  });

  const handleDrawerAdjustStock = async (productId: string, delta: number, reason?: "adjustment" | "loss") => {
    await updateStock(productId, delta, reason);
  };

  const handleAddProduct = async (newProduct: Product) => {
    await addProduct(newProduct);
    addToast(
      "success",
      "Produit ajouté",
      `${newProduct.name} est dans les stocks.`
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

  const handleSelectForOrder = async (product: Product) => {
    const saved = await addToCart({ id: `product-${product.id}`, productId: product.id,
      productName: product.name, quantity: getSuggestedOrderQuantity(product), unit: product.unit, source: "stocks" });
    if (saved) navigate("/orders#selection");
  };

  return (
    <div className="stocks-container workspace-page">
      {loading && <p role="status">Chargement du stock…</p>}
      {error && <div role="alert"><p>{error.message}</p><Button onClick={() => void refetch()}>Réessayer</Button></div>}
      <header className="workspace-header">
        <div>
          <h1>Stocks</h1>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Ajouter un produit
        </Button>
      </header>

      <p className="stocks-source">Quantités enregistrées dans ce restaurant. Le catalogue initial contient des exemples à confirmer ; les seuils ne tiennent pas compte des ventes importées.</p>
      <div className="view-toggles" aria-label="Vue des stocks">
        <Button size="sm" aria-pressed={view === "review"} onClick={() => setView("review")}>À vérifier ({productsToReview.length})</Button>
        <Button size="sm" aria-pressed={view === "all"} onClick={() => setView("all")}>Tout l'inventaire ({products.length})</Button>
      </div>

      {view === "review" ? <section aria-labelledby="stock-review-title"><div className="workspace-section-heading"><h2 id="stock-review-title">Produits au seuil ou en dessous</h2></div>
        {!loading && !error && <StockReview products={productsToReview} suppliers={suppliers} selecting={cartLoading} onInspect={setSelectedProductId} onSelect={(product) => void handleSelectForOrder(product)} />}
      </section> : <>

      <Card className="stocks-toolbar">
        <div className="toolbar-content">
          <div className="search-wrapper">
            <Input
              id="stock-search"
              label="Rechercher un produit"
              placeholder="Nom du produit"
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
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
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

      <div className="workspace-section-heading"><h2>Produits</h2><span role="status">{filteredProducts.length} résultat{filteredProducts.length > 1 ? "s" : ""}</span></div>
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
                <tr key={product.id}>
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
                          ? "Au-dessus du seuil"
                          : status === "moderate"
                          ? "Au seuil ou en dessous"
                          : "Sous le seuil enregistré"
                      }
                      status="neutral"
                    />
                  </td>
                  <td>
                    <div className="actions-cell">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<ShoppingCart size={14} />}
                        disabled={cartLoading}
                        onClick={() => void handleSelectForOrder(product)}
                      >
                        Ajouter à la commande
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 && <tr><td colSpan={6}><div className="workspace-empty">Aucun produit trouvé. Modifiez la recherche ou les filtres.</div></td></tr>}
          </tbody>
        </table>
      </div>
      </>}
      {selectedProduct && <ProductDetail
        key={selectedProduct.id}
        product={selectedProduct}
        onClose={() => setSelectedProductId(null)}
        onAdjustStock={handleDrawerAdjustStock}
        suppliers={suppliers}
      />}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddProduct}
        suppliers={suppliers}
      />

      {isFiltersModalOpen && <FiltersModal
        isOpen
        onClose={() => setIsFiltersModalOpen(false)}
        onApply={handleApplyFilters}
        suppliers={suppliers}
        appliedFilters={advancedFilters}
      />}
    </div>
  );
};

export default Stocks;
