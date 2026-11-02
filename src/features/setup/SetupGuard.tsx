import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Button from "../../components/common/Button";
import { useAuth } from "../auth/context/AuthContext";
import { checkSetup, type SetupProgress } from "./setupApi";
import { returnTo } from "../auth/returnTo";
import { setupDestination } from "./setupLogic";

export function SetupGuard({ setupPage = false }: { setupPage?: boolean }) {
  const { user } = useAuth();
  if (!user) return <div className="auth-loading" role="status">Chargement de votre session…</div>;
  return <AccountSetupGuard key={user.id} userId={user.id} setupPage={setupPage} />;
}

function AccountSetupGuard({ setupPage, userId }: { setupPage: boolean; userId: string }) {
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const { refreshUser } = useAuth();
  useEffect(() => {
    let active = true;
    checkSetup(userId, refreshUser).then(
      (result) => { if (active) setProgress(result); },
      () => { if (active) setError(true); },
    );
    return () => { active = false; };
  }, [attempt, refreshUser, userId]);
  useEffect(() => {
    if (setupPage) return;
    const refresh = () => { if (document.visibilityState === "visible") { setError(false); setAttempt((value) => value + 1); } };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [setupPage]);
  if (!progress && !error) return <div className="auth-loading" role="status">Chargement de votre établissement…</div>;
  if (error) return <main className="container"><p role="alert">Impossible de vérifier votre établissement.</p><Button onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Réessayer</Button></main>;
  if (!progress) return null;
  const destination = setupDestination(progress.configured, progress.step, setupPage);
  if (destination === "return") return <Navigate to={returnTo(location.state)} replace />;
  if (destination === "setup") return <Navigate to="/setup" state={{ from: location }} replace />;
  return <Outlet context={progress} />;
}
