import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export const PublicOnly = () => { const { status } = useAuth(); if (status === "loading") return <div className="auth-loading" role="status">Chargement...</div>; return status === "authenticated" ? <Navigate to="/" replace /> : <Outlet />; };
