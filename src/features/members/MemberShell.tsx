import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { getOrderView } from "../orders/orderNavigation";
import "./MemberShell.css";

export type MemberRole = "chef" | "kitchen";
export default function MemberShell({ role, canStock, canReceive, canOrder, children, onLogout }: { role: MemberRole; canStock: boolean; canReceive: boolean; canOrder: boolean; children: ReactNode; onLogout: () => void }) {
  const { pathname, search, hash } = useLocation();
  const orderView = pathname === "/orders" ? getOrderView(new URLSearchParams(search), hash) : null;
  return <div className="member-shell"><header className="member-header"><strong>KookIA</strong><div><span>{role === "chef" ? "Chef" : "Cuisine"}</span> <button type="button" onClick={onLogout}>Se déconnecter</button></div></header>
    <nav className="member-nav" aria-label="Navigation de l’équipe"><NavLink to="/" end>Accueil</NavLink>{canStock && <NavLink to="/stocks">Stocks</NavLink>}
      {canReceive && <Link to="/orders?view=receipts" aria-current={orderView === "receipts" ? "page" : undefined}>Réceptions</Link>}{canOrder && <Link to="/orders?view=prepare" aria-current={orderView === "prepare" ? "page" : undefined}>Préparer une commande</Link>}</nav>
    <main id="main-content" tabIndex={-1}>{children}</main></div>;
}
