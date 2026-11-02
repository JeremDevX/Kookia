import { createContext, useContext, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import { CartProvider } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../auth/context/AuthContext";
import type { SetupProgress } from "../setup/setupApi";
import { getOrderView } from "../orders/orderNavigation";
import MemberShell from "./MemberShell";
import MemberHome from "./MemberHome";
import MemberStocks from "./MemberStocks";
import MemberReceipts from "./MemberReceipts";
import MemberOrders from "./MemberOrders";

const WorkspaceContext = createContext<SetupProgress | null>(null);
const useWorkspace = () => { const value = useContext(WorkspaceContext); if (!value) throw new Error("Workspace unavailable"); return value; };
export function WorkspaceLayout() {
  const workspace = useOutletContext<SetupProgress>();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  if (!workspace.role || !workspace.capabilities) return <p role="alert">Établissement indisponible.</p>;
  const leave = () => { void logout().then(() => navigate("/login", { replace: true })).catch((error: unknown) => addToast("info", "Déconnexion impossible", error instanceof Error ? error.message : "Réessayez.")); };
  const content = workspace.role === "owner" ? <Layout /> : <MemberShell role={workspace.role} canStock={workspace.capabilities.viewStock} canReceive={workspace.capabilities.receiveOrders} canOrder={workspace.capabilities.validateOrders} onLogout={leave}><Outlet /></MemberShell>;
  return <WorkspaceContext.Provider value={workspace}>{workspace.role === "owner" || workspace.capabilities.validateOrders ? <CartProvider>{content}</CartProvider> : content}</WorkspaceContext.Provider>;
}
export function WorkspaceHome({ owner }: { owner: ReactNode }) {
  const workspace = useWorkspace();
  if (workspace.role === "owner") return owner;
  if (!workspace.role || !workspace.capabilities || !workspace.restaurantName) return null;
  const { viewStock, receiveOrders, validateOrders } = workspace.capabilities;
  return <MemberHome role={workspace.role} restaurantName={workspace.restaurantName} canStock={viewStock} canReceive={receiveOrders} canOrder={validateOrders} />;
}
export function WorkspaceStocks({ owner }: { owner: ReactNode }) {
  const workspace = useWorkspace();
  if (workspace.role === "owner") return owner;
  return workspace.capabilities?.viewStock && workspace.capabilities.countStock ? <MemberStocks /> : <AccessDenied />;
}
export function WorkspaceOrders({ owner }: { owner: ReactNode }) {
  const workspace = useWorkspace();
  const location = useLocation();
  if (workspace.role === "owner") return owner;
  const view = getOrderView(new URLSearchParams(location.search), location.hash);
  if (view === "prepare") return workspace.role === "chef" && workspace.capabilities?.validateOrders ? <MemberOrders role="chef" /> : <AccessDenied />;
  if (view === "invoices") return <AccessDenied />;
  return workspace.capabilities?.receiveOrders ? <MemberReceipts /> : <AccessDenied />;
}
export function OwnerOnly({ children }: { children: ReactNode }) {
  return useWorkspace().role === "owner" ? children : <AccessDenied />;
}
function AccessDenied() { return <div className="member-page"><h1>Accès indisponible</h1><p>Cette page n’est pas disponible pour votre compte.</p><Link to="/">Retour à l’accueil</Link></div>; }
