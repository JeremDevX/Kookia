import { useState } from "react";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import StockCountList from "../../components/stocks/StockCountList";
import StockCountModal from "../../components/stocks/StockCountModal";
import { useProductsWithMutations } from "../../hooks";
import "../../styles/Workspace.css";
import "../../pages/Stocks.css";

export default function MemberStocks() {
  const { products, loading, error, refetch, recordCount } = useProductsWithMutations();
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const product = products.find((item) => item.id === productId);
  const visible = products.filter((item) => item.name.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")));
  return <div className="member-page stocks-container workspace-page"><h1>Stocks</h1><p>Consultez les quantités théoriques et comptez les produits disponibles.</p>
    <Input id="member-stock-search" label="Rechercher un produit" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Chargement des stocks…</p> : error ? <div role="alert"><p>Stocks indisponibles.</p><Button type="button" variant="outline" onClick={() => void refetch()}>Réessayer</Button></div> :
      <StockCountList products={visible} onCount={(id) => { setNotice(""); setProductId(id); }} />}
    {product && <StockCountModal product={product} isOpen onClose={() => setProductId(null)} onRefresh={refetch} onSave={async (id, count) => {
      const result = await recordCount(id, count); setNotice("Comptage enregistré."); return result;
    }} />}
  </div>;
}
