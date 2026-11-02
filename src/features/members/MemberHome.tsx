import { Link } from "react-router-dom";
import type { MemberRole } from "./MemberShell";

export default function MemberHome({ role, restaurantName, canStock, canReceive, canOrder }: { role: MemberRole; restaurantName: string; canStock: boolean; canReceive: boolean; canOrder: boolean }) {
  return <div className="member-page"><h1>Votre espace {role === "chef" ? "chef" : "cuisine"}</h1><p>{restaurantName}</p>
    <div className="member-cards">{canStock && <section><h2>Stocks</h2><p>Consultez les produits et enregistrez un comptage.</p><Link to="/stocks">Ouvrir les stocks</Link></section>}
      {canReceive && <section><h2>Réceptions</h2><p>Consultez les livraisons et rapprochez les pièces enregistrées.</p><Link to="/orders?view=receipts">Ouvrir les réceptions</Link></section>}
      {canOrder && <section><h2>Commandes</h2><p>Préparez une commande à vérifier avant validation.</p><Link to="/orders?view=prepare">Préparer une commande</Link></section>}
    </div></div>;
}
