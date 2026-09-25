import React from "react";
import { Menu, ChevronRight, Settings2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "../../styles/index.css";
import "./TopNav.css";
import { useAuth } from "../../features/auth/context/AuthContext";

interface TopNavProps {
  onMenuClick: () => void;
  isSidebarOpen: boolean;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick, isSidebarOpen, menuButtonRef }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const pageLabels: Record<string, string> = {
    "/": "Aujourd'hui",
    "/stocks": "Stocks",
    "/predictions": "Scénarios d'exemple",
    "/recipes": "Recettes",
    "/settings": "Réglages",
    "/analytics": "Bilan",
    "/history": "Historique",
    "/orders": "Achats",
    "/sales": "Ventes",
    "/more": "Plus",
  };

  const currentPage = pageLabels[pathname] ?? (pathname.startsWith("/history/") ? "Historique" : "Aujourd'hui");

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          ref={menuButtonRef}
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
          aria-expanded={isSidebarOpen}
          aria-controls="main-sidebar"
        >
          <Menu size={24} />
        </button>
        <div className="breadcrumbs">
          <span className="breadcrumb-parent">Restaurant</span>
          <ChevronRight size={14} aria-hidden="true" />
          <span className="current-page">{currentPage}</span>
        </div>
      </div>

      <div className="top-nav-actions">
        <Link to="/settings?section=account" className="user-profile" aria-label="Ouvrir mon compte">
          <div className="avatar">{user?.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "K"}</div>
          <span className="profile-copy"><span className="username">{user?.displayName || "Mon compte"}</span></span>
          <Settings2 size={15} className="profile-settings" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
};

export default TopNav;
