import React from "react";
import { Menu } from "lucide-react";
import Notifications from "./Notifications";
import "../../styles/index.css";
import "./TopNav.css";

interface TopNavProps {
  onMenuClick: () => void;
}

const TopNav: React.FC<TopNavProps> = ({ onMenuClick }) => {
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
          <span className="current-page">Dashboard</span>
        </div>
      </div>

      <div className="top-nav-actions">
        <Notifications />
        <div className="user-profile">
          <div className="avatar">CM</div>
          <span className="username">Camille MM</span>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
