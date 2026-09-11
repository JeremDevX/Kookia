import React from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Notifications from "./Notifications";
import "../../styles/index.css";
import "./TopNav.css";
import { useAuth } from "../../features/auth/context/AuthContext";

interface TopNavProps {
  onMenuClick: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const pageLabels: Record<string, string> = {
    "/": "Dashboard",
    "/stocks": "Stocks",
    "/predictions": "Predictions",
    "/recipes": "Recipes",
    "/settings": "Settings",
    "/analytics": "Analytics",
  };

  const currentPage = pageLabels[pathname] ?? "Dashboard";

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          className="hamburger-btn"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>
        <div className="breadcrumbs">
          <span className="current-page">{currentPage}</span>
        </div>
      </div>

      <div className="top-nav-actions">
        <Notifications />
        <Link to="/settings" className="user-profile" aria-label="Ouvrir mon compte">
          <div className="avatar">{user?.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "K"}</div>
          <span className="username">{user?.displayName || "Mon compte"}</span>
        </Link>
      </div>
    </header>
  );
};

export default TopNav;
