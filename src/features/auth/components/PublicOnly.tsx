import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { returnTo } from "../returnTo";
import { SessionError } from "./SessionError";
import { useAuth } from "../context/AuthContext";

export const PublicOnly = () => {
  const { status } = useAuth();
  const location = useLocation();
  const openWorkshop = status === "authenticated" && location.pathname === "/login" &&
    new URLSearchParams(location.search).get("retour") === "atelier";
  useEffect(() => {
    if (openWorkshop) window.location.replace("/generateur/?vue=automatique");
  }, [openWorkshop]);

  if (status === "loading" || openWorkshop) return <div className="auth-loading" role="status">Chargement...</div>;
  if (status === "error") return <SessionError />;
  return status === "authenticated" ? <Navigate to={returnTo(location.state)} replace /> : <Outlet />;
};
