import { useState } from "react";
import Button from "../../components/common/Button";
import PurchaseSuggestions from "../../components/dashboard/PurchaseSuggestions";
import OrderGenerator from "../../components/dashboard/OrderGenerator";
import StockInventoryTable from "../../components/stocks/StockInventoryTable";
import StockInventoryCard from "../../components/stocks/StockInventoryCard";
import StockCountModal from "../../components/stocks/StockCountModal";
import { useCart } from "../../context/useCart";
import { useProductsWithMutations } from "../../hooks";
import { useInventoryCatalog } from "../inventory/useInventoryCatalog";
import { getSuggestedOrderQuantity } from "../../domain/inventory/product.policies";
import { createOrderRecommendationsFromCartItems } from "../orders/orderRecommendations";
import type { MemberRole } from "./MemberShell";
import type { Product } from "../../types";
import "../../styles/Workspace.css";
import "../../pages/Orders.css";
import "../../pages/Stocks.css";

export default function MemberOrders({ role }: { role: MemberRole }) {
  return role === "chef" ? <ChefOrders /> : <div className="member-page"><h1>Accès indisponible</h1><p>La préparation des commandes n’est pas disponible pour ce compte.</p></div>;
}

function ChefOrders() {
  const { cartItems, loading: cartLoading, loadError, addToCart, removeFromCart, refreshCart } = useCart();
  const { products, loading, error, refetch, recordCount } = useProductsWithMutations();
  const { suppliers, loading: catalogLoading, error: catalogError, refetch: refreshCatalog } = useInventoryCatalog();
  const [review, setReview] = useState(false);
  const [countId, setCountId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const countProduct = products.find((item) => item.id === countId);
  const add = async (product: Product) => {
    await addToCart({ id: `product-${product.id}`, productId: product.id, productName: product.name,
      quantity: getSuggestedOrderQuantity(product), unit: product.unit, source: "stocks" });
  };
  const recommendations = createOrderRecommendationsFromCartItems(cartItems);
  const invalid = cartItems.some((item) => item.predictionId || !products.some((product) => product.id === item.productId));
  return <div className="member-page orders-container stocks-container workspace-page"><h1>Préparer une commande</h1>
    <p>Examinez votre sélection. La validation enregistre la commande sans l’envoyer au fournisseur.</p>
    <PurchaseSuggestions refreshKey={revision} limited salesHref={null} stocksHref="/orders?view=prepare#member-select-products" />
    <section id="member-select-products" aria-labelledby="member-products-title"><h2 id="member-products-title">Choisir des produits</h2>
      {loading ? <p role="status">Chargement des produits…</p> : error ? <div role="alert"><p>Catalogue indisponible.</p><Button type="button" variant="outline" onClick={() => void refetch()}>Réessayer</Button></div> : <>
        <StockInventoryTable products={products} selecting={cartLoading} onInspect={setCountId} onSelect={(product) => void add(product)} />
        <ul className="stock-inventory-cards" aria-label="Produits">{products.map((product) => <StockInventoryCard key={product.id} product={product} selecting={cartLoading} onInspect={() => setCountId(product.id)} onSelect={() => void add(product)} />)}</ul>
      </>}
    </section>
    <section aria-labelledby="member-selection-title"><h2 id="member-selection-title">Commande en préparation</h2>
      {loadError ? <div role="alert"><p>{loadError}</p><Button type="button" variant="outline" onClick={() => void refreshCart()}>Réessayer</Button></div> : cartLoading ? <p role="status">Chargement de la sélection…</p> : cartItems.length === 0 ? <p>Aucun produit sélectionné.</p> : <ul>{cartItems.map((item) => <li key={item.id}>{item.productName} · {item.quantity.toLocaleString("fr-FR")} {item.unit} <Button type="button" variant="ghost" onClick={() => void removeFromCart(item.id)}>Retirer {item.productName}</Button></li>)}</ul>}
      {catalogError && <div role="alert"><p>Fournisseurs indisponibles.</p><Button type="button" variant="outline" onClick={() => void refreshCatalog()}>Réessayer</Button></div>}
      {!loading && !error && invalid && <p>Retirez les produits indisponibles ou les propositions non rapprochées avant de continuer.</p>}
      <Button type="button" disabled={cartLoading || !!loadError || loading || !!error || !!catalogError || catalogLoading || invalid || cartItems.length === 0} onClick={() => setReview(true)}>Revoir la commande</Button>
    </section>
    {countProduct && <StockCountModal product={countProduct} isOpen onClose={() => setCountId(null)} onRefresh={refetch} onSave={recordCount} />}
    {review && <OrderGenerator recommendations={recommendations} products={products} suppliers={suppliers} catalogLoading={catalogLoading} catalogError={catalogError} onRetryCatalog={refreshCatalog} onClose={() => setReview(false)} onValidated={() => { void refreshCart(); setRevision((value) => value + 1); }} orderHref="/orders?view=receipts" />}
  </div>;
}
