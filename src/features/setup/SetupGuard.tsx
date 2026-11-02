import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Button from "../../components/common/Button";
import { useAuth } from "../auth/context/AuthContext";
import { checkSetup } from "./setupApi";
import { returnTo } from "../auth/returnTo";
import { setupDestination } from "./setupLogic";

export function SetupGuard({ setupPage = false }: { setupPage?: boolean }) {
  const { user } = useAuth();
  if (!user) return <div className="auth-loading" role="status">Chargement de votre session…</div>;
  return <AccountSetupGuard key={user.id} userId={user.id} setupPage={setupPage} />;
}

function AccountSetupGuard({ setupPage, userId }: { setupPage: boolean; userId: string }) {
  const [status, setStatus] = useState<"loading" | "configured" | "unconfigured" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const { refreshUser } = useAuth();
  useEffect(() => {
    let active = true;
    checkSetup(userId, refreshUser).then(
      (result) => { if (active) setStatus(result.configured ? "configured" : "unconfigured"); },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [attempt, refreshUser, userId]);
  if (status === "loading") return <div className="auth-loading" role="status">Chargement de votre établissement…</div>;
  if (status === "error") return <main className="container"><p role="alert">Impossible de vérifier votre établissement.</p><Button onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }}>Réessayer</Button></main>;
  const destination = setupDestination(status === "configured", setupPage);
  if (destination === "return") return <Navigate to={returnTo(location.state)} replace />;
  if (destination === "setup") return <Navigate to="/setup" state={{ from: location }} replace />;
  return <Outlet />;
}
