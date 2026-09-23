import OrderHistory from "../components/dashboard/OrderHistory";
import "../styles/Workspace.css";

export default function Orders() {
  return <div className="orders-container workspace-page">
    <header className="workspace-header"><div>
      <h1>Commandes validées</h1>
      <p className="workspace-subtitle">À transmettre aux fournisseurs. Aucun envoi automatique.</p>
    </div></header>
    <OrderHistory />
  </div>;
}
