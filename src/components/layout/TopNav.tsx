import React, { useState } from "react";
import { Menu, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import searchIcon from "../../assets/figma-layout/search.svg";
import { getOrderView } from "../../features/orders/orderNavigation";
import { getRecipeView } from "../../features/recipes/recipeNavigation";
import "../../styles/index.css";
import "./TopNav.css";
import { useAuth } from "../../features/auth/context/AuthContext";
import WeatherNavButton from "./WeatherNavButton";

interface TopNavProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick, isSidebarOpen, menuButtonRef }) => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const pageLabels: Record<string, string> = {
    "/": "Tableau de bord",
    "/stocks": "Stocks",
    "/predictions": "Prévisions",
    "/recipes": "Recettes",
    "/settings": "Paramètres",
    "/analytics": "Bilan",
    "/history": "Historique",
    "/orders": "Commandes",
    "/sales": "Ventes",
    "/services": "Services et carte",
    "/more": "Plus",
  };

  const currentPage = pageLabels[pathname] ?? (pathname.startsWith("/history/") ? "Historique" : "Tableau de bord");
  const params = new URLSearchParams(search);
  const orderView = pathname === "/orders" ? getOrderView(params, hash) : null;
  const section = pathname === "/predictions" ? "Bilan" : currentPage;
  const subpage = pathname === "/" ? "Vue d’ensemble" : pathname === "/stocks" ? "Inventaire" :
    orderView ? { prepare: "Préparer un achat", orders: "Commandes et réceptions", invoices: "Factures et documents" }[orderView] :
    pathname === "/predictions" ? "Prévisions" : pathname === "/recipes" ?
      ({ catalog: "Toutes les recettes", "anti-waste": "Réalisables avec le stock", sheets: "Fiches techniques", history: "Produites cette semaine" })[getRecipeView(params)] : pathname === "/settings" ?
      ({ account: "Compte", suppliers: "Fournisseurs", connections: "Connexions" } as Record<string, string>)[params.get("section") ?? ""] ?? "Restaurant" : null;

  const searchProducts = (event: React.FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term) {
      navigate(`/stocks?${new URLSearchParams({ search: term })}#stock-search`);
      if (pathname === "/stocks") requestAnimationFrame(() => document.getElementById("stock-search")?.focus());
    }
  };

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          ref={menuButtonRef}
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isSidebarOpen}
          aria-controls="main-sidebar"
        >
          <Menu size={24} />
        </button>
        <nav className="breadcrumbs" aria-label="Fil d’Ariane">
          <Link className="breadcrumb-brand" to="/" aria-label="Accueil">K</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span className={subpage ? "breadcrumb-parent" : "current-page"}>{section}</span>
          {subpage && <><ChevronRight size={14} aria-hidden="true" /><span className="current-page" aria-current="page">{subpage}</span></>}
        </nav>
      </div>

      <div className="top-nav-actions">
        <form className="top-nav-search" role="search" onSubmit={searchProducts}>
          <button type="submit" aria-label="Rechercher un produit"><img src={searchIcon} alt="" /></button>
          <input aria-label="Rechercher un produit" type="search" placeholder="Rechercher un produit…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </form>
        <WeatherNavButton />
        <Link to="/settings?section=account" className="user-profile" aria-label="Ouvrir mon compte">
          <div className="avatar">{user?.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "K"}</div>
          <span className="profile-copy"><span className="username">{user?.displayName || "Mon compte"}</span></span>
        </Link>
      </div>
    </header>
  );
};

export default TopNav;
