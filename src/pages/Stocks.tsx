import React, { useRef, useState } from "react";
import StockInventoryTable from "../components/stocks/StockInventoryTable";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import ProductDetail from "../components/stocks/ProductDetail";
import AddProductModal from "../components/stocks/AddProductModal";
import FiltersModal from "../components/stocks/FiltersModal";
import StockInventoryCard from "../components/stocks/StockInventoryCard";
import { Search, Filter, Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProductsWithMutations } from "../hooks";
import { useCart } from "../context/useCart";
import { useToast } from "../context/ToastContext";
import type { Product } from "../types";
import type { NewProduct, StockFilters } from "../types/callbacks";
import { useInventoryCatalog } from "../features/inventory/useInventoryCatalog";
import { getSuggestedOrderQuantity, needsStockReview } from "../domain/inventory/product.policies";
import { analyticsReturnHref } from "../utils/analyticsNavigation";
import "../styles/Workspace.css";
import "./Stocks.css";

const Stocks: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusedMovementId = searchParams.get("movement");
  const analyticsReturn = analyticsReturnHref(searchParams.get("returnFrom"), searchParams.get("returnTo"),
    searchParams.get("returnAnchor"));
  const { addToast } = useToast();
  const { addToCart, loading: cartLoading } = useCart();
  const { products, updateStock, updateProduct, recordCount, addProduct, getStatus, loading, error, refetch } =
    useProductsWithMutations();
  const { suppliers, error: catalogError, refetch: refetchCatalog } = useInventoryCatalog();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    () => searchParams.get("product")
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [view, setView] = useState<"review" | "all">("all");
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
  const hasFilters = searchTerm !== "" || categoryFilter !== "all" || Object.values(advancedFilters).some((value) => value !== "all");
  const advancedFilterCount = Object.values(advancedFilters).filter((value) => value !== "all").length;

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
      (view === "all" || needsStockReview(p)) &&
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

  const handleAddProduct = async (newProduct: NewProduct) => {
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
      {(error || catalogError) && <div role="alert"><p>{(error ?? catalogError)?.message}</p><Button onClick={() => {
        void Promise.all([refetch(), refetchCatalog()]);
        requestAnimationFrame(() => headingRef.current?.focus());
      }}>Réessayer</Button></div>}
      <header className="workspace-header">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>Stocks</h1>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => setIsAddModalOpen(true)}
        >
          Ajouter un produit
        </Button>
      </header>

      <section className="inventory-panel" aria-label="Inventaire">
      <div className="inventory-navigation">
        <div className="inventory-tabs" role="group" aria-label="Vue des stocks">
          <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")}>Tout l’inventaire</button>
          <button type="button" aria-pressed={view === "review"} onClick={() => setView("review")}>À traiter</button>
        </div>
        <span className="inventory-result" role="status">{loading ? "Chargement…" : `${filteredProducts.length} produit${filteredProducts.length > 1 ? "s" : ""}`}</span>
      </div>
      <div className="stocks-toolbar">
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
              Filtres{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ""}
            </Button>
          </div>
        </div>
        {hasFilters && <button type="button" className="inventory-reset" onClick={() => {
          setSearchTerm(""); setCategoryFilter("all");
          setAdvancedFilters({ status: "all", supplier: "all", stockLevel: "all" });
          document.getElementById("stock-search")?.focus();
        }}>Effacer les filtres</button>}
      </div>
      {!loading && !error && <>
      <StockInventoryTable products={filteredProducts} selecting={cartLoading}
        onInspect={setSelectedProductId} onSelect={(product) => void handleSelectForOrder(product)} />
      <ul className="stock-inventory-cards" aria-label="Inventaire des produits">
        {filteredProducts.map((product) => <StockInventoryCard key={product.id} product={product} selecting={cartLoading}
          onInspect={() => setSelectedProductId(product.id)} onSelect={() => void handleSelectForOrder(product)} />)}
        {filteredProducts.length === 0 && <li className="workspace-empty">Aucun produit trouvé. Modifiez la recherche ou les filtres.</li>}
      </ul>
      </>}
      <p className="inventory-footnote">Quantités théoriques · Achats à valider avant commande.</p>
      </section>
      {selectedProduct && <ProductDetail
        key={selectedProduct.id}
        product={selectedProduct}
        focusedMovementId={focusedMovementId}
        returnHref={analyticsReturn}
        onClose={() => analyticsReturn ? navigate(analyticsReturn) : setSelectedProductId(null)}
        onAdjustStock={handleDrawerAdjustStock}
        onUpdateProduct={updateProduct}
        onRecordCount={recordCount}
        onRefresh={refetch}
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
