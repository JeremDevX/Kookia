import { Navigate, Outlet, useLocation } from "react-router-dom";
import { returnTo } from "../returnTo";
import { SessionError } from "./SessionError";
import { useAuth } from "../context/AuthContext";
export const PublicOnly = () => { const { status } = useAuth(); const location = useLocation(); if (status === "loading") return <div className="auth-loading" role="status">Chargement...</div>; if (status === "error") return <SessionError />; return status === "authenticated" ? <Navigate to={returnTo(location.state)} replace /> : <Outlet />; };
