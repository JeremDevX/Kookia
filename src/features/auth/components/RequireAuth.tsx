import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export const RequireAuth = () => { const { status } = useAuth(); const location = useLocation(); if (status === "loading") return <div className="auth-loading" role="status">Chargement de votre session...</div>; return status === "authenticated" ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />; };
