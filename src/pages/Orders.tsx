import OrderHistory from "../components/dashboard/OrderHistory";
import "../styles/Workspace.css";

export default function Orders() {
  return <div className="orders-container workspace-page">
    <header className="workspace-header"><div>
      <p className="workspace-eyebrow">VOS DÉCISIONS D’ACHAT</p>
      <h1>Commandes validées</h1>
      <p className="workspace-subtitle">Retrouvez les quantités et les prix enregistrés lors de chaque validation. Ces commandes restent à transmettre à vos fournisseurs.</p>
    </div></header>
    <OrderHistory />
  </div>;
}
