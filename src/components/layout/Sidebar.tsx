import React, { useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ClipboardList,
  HelpCircle,
  LogOut,
  Ellipsis,
  X,
  Leaf,
  ArrowUpRight,
} from "lucide-react";
// Styles are imported in Sidebar.css
import "./Sidebar.css";
import { useAuth } from "../../features/auth/context/AuthContext";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inMore = ["/recipes", "/analytics", "/settings", "/predictions"].includes(pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    const sidebar = sidebarRef.current;
    const focusFrame = requestAnimationFrame(() => sidebar?.querySelector<HTMLButtonElement>(".sidebar-close-btn")?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !sidebar) return;
      const items = Array.from(sidebar.querySelectorAll<HTMLElement>("a[href], button")).filter((item) => item.getClientRects().length > 0);
      const first = items[0];
      const last = items.at(-1);
      if (!sidebar.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 769px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    document.addEventListener("keydown", handleKey);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", closeOnDesktop);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen, onClose]);
  const navItems = [
    { icon: LayoutDashboard, label: "Aujourd'hui", path: "/" },
    { icon: ShoppingBag, label: "Achats", path: "/orders" },
    { icon: Package, label: "Stocks", path: "/stocks" },
    { icon: ClipboardList, label: "Ventes", path: "/sales" },
    { icon: Ellipsis, label: "Plus", path: "/more" },
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

      <aside id="main-sidebar" ref={sidebarRef} className={`sidebar ${isOpen ? "open" : ""}`} aria-label="Navigation principale">
        <div className="sidebar-header">
          <NavLink to="/" onClick={handleNavClick} aria-label="KookiA — accueil"><img src="/logo_kookia.svg" alt="KookiA" className="logo-img" /></NavLink>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-workspace"><span className="workspace-icon"><Leaf size={19} aria-hidden="true" /></span><div><strong>Mon restaurant</strong></div></div>
        <nav className="sidebar-nav" aria-label="Pages du restaurant">
          <p className="sidebar-label">NAVIGATION</p>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              aria-current={item.path === "/more" && inMore ? "page" : undefined}
              className={({ isActive }) =>
                `nav-item ${isActive || (item.path === "/more" && inMore) ? "active" : ""}`
              }
            >
              <item.icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a
            href="mailto:support@kookia.app?subject=Support%20KookiA"
            className="nav-item"
            onClick={handleNavClick}
          >
            <HelpCircle size={20} />
            <span>Besoin d’aide ?</span><ArrowUpRight size={14} className="support-arrow" aria-hidden="true" />
          </a>
          <button className="nav-item logout-btn" onClick={() => { void logout().finally(() => navigate("/login", { replace: true })); }}>
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
