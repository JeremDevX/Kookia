import React, { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  ClipboardList,
  BookOpen,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Ellipsis,
  X,
  ArrowUpRight,
} from "lucide-react";
// Styles are imported in Sidebar.css
import "./Sidebar.css";
import { useAuth } from "../../features/auth/context/AuthContext";
import SidebarSubnav from "./SidebarSubnav";
import { getOrderView } from "../../features/orders/orderNavigation";
import { getRestaurant, type Restaurant } from "../../services/restaurantService";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, returnFocusRef }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();
  const showingReceipts = pathname === "/orders" && getOrderView(new URLSearchParams(search), hash) === "receipts";
  const inMore = ["/services", "/history"].includes(pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = () => {
      const current = ++request;
      getRestaurant().then((data) => { if (active && current === request) setRestaurant(data); }, () => { if (active && current === request) setRestaurant(null); });
    };
    refresh();
    window.addEventListener("restaurant-saved", refresh);
    return () => { active = false; window.removeEventListener("restaurant-saved", refresh); };
  }, []);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const menuButton = returnFocusRef.current;
    const previousFocus = menuButton ?? document.activeElement;
    const sidebar = sidebarRef.current;
    let focusFrame = 0;
    const focusWhenVisible = () => {
      if (!sidebar) return;
      if (getComputedStyle(sidebar).visibility !== "hidden") {
        const closeButton = sidebar.querySelector<HTMLButtonElement>(".sidebar-close-btn");
        if (closeButton?.getClientRects().length) closeButton.focus();
        return;
      }
      focusFrame = requestAnimationFrame(focusWhenVisible);
    };
    focusFrame = requestAnimationFrame(focusWhenVisible);
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
      requestAnimationFrame(() => {
        const target = previousFocus instanceof HTMLElement && previousFocus.isConnected
          ? previousFocus
          : menuButton;
        target?.focus();
      });
    };
  }, [isOpen, onClose, returnFocusRef]);
  const navItems = [
    { icon: LayoutDashboard, label: "Tableau de bord", path: "/" },
    { icon: ShoppingBag, label: "Commandes", path: "/orders" },
    { icon: Truck, label: "Réceptions", path: "/orders?view=receipts" },
    { icon: Package, label: "Stocks", path: "/stocks" },
    { icon: BookOpen, label: "Recettes", path: "/recipes" },
    { icon: BarChart3, label: "Bilan", path: "/analytics" },
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
          <NavLink to="/" onClick={handleNavClick} aria-label="KookIA — accueil" className="sidebar-brand"><span className="sidebar-brand-mark" aria-hidden="true">K</span><span><strong>KookIA</strong><small>Restaurant</small></span></NavLink>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Pages du restaurant">
          <p className="sidebar-label">MENU PRINCIPAL</p>
          {navItems.map((item) => {
            const section = item.path === "/orders?view=receipts" && showingReceipts ? "receipts" :
              item.path === "/orders" && pathname === "/orders" && !showingReceipts ? "orders" :
              item.path === "/stocks" && pathname === "/stocks" ? "stocks" :
              item.path === "/recipes" && pathname === "/recipes" ? "recipes" :
              item.path === "/analytics" && (pathname === "/analytics" || pathname === "/predictions") ? "analytics" : null;
            return <React.Fragment key={item.path}>
            <NavLink
              to={item.path}
              onClick={handleNavClick}
              aria-current={section ? "location" : item.path === "/orders?view=receipts" || (item.path === "/orders" && showingReceipts) ? false : item.path === "/more" && inMore ? "page" : undefined}
              className={({ isActive }) =>
                `nav-item ${item.path === "/orders?view=receipts" ? showingReceipts ? "active" : "" : item.path === "/orders" && showingReceipts ? "" : isActive || (item.path === "/more" && inMore) || (item.path === "/analytics" && pathname === "/predictions") ? "active" : ""}`
              }
            >
              <item.icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
            {section && <SidebarSubnav section={section} onNavigate={handleNavClick} />}
            </React.Fragment>;
          })}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/settings" onClick={handleNavClick} aria-current={pathname === "/settings" ? "location" : undefined} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Settings size={20} aria-hidden="true" />
            <span>Paramètres</span>
          </NavLink>
          {pathname === "/settings" && <SidebarSubnav section="settings" onNavigate={handleNavClick} />}
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
          {restaurant?.name.trim() && <div className="sidebar-restaurant">
            <span className="sidebar-restaurant-avatar" aria-hidden="true">{restaurant.name.trim().charAt(0).toUpperCase()}</span>
            <span className="sidebar-restaurant-details"><strong>{restaurant.name}</strong>{restaurant.city && <small>{restaurant.city}</small>}</span>
          </div>}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
