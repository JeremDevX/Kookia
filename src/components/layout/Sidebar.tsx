import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Brain,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  BookOpen,
  X,
} from "lucide-react";
// Styles are imported in Sidebar.css
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Package, label: "Stocks", path: "/stocks" },
    { icon: Brain, label: "Prédictions", path: "/predictions" },
    { icon: BookOpen, label: "Recettes", path: "/recipes" }, // New
    { icon: BarChart3, label: "Analytics", path: "/analytics" }, // Phase 1.5
    { icon: Settings, label: "Paramètres", path: "/settings" },
  ];

  // Close sidebar on navigation (for mobile)
  const handleNavClick = () => {
    onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <img src="/logo_kookia.svg" alt="KookiA" className="logo-img" />
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="nav-item" onClick={handleNavClick}>
            <HelpCircle size={20} />
            <span>Support</span>
          </a>
          <button className="nav-item logout-btn">
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
