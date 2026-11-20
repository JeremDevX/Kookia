import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarClock, CircleAlert, LockKeyhole, RotateCw } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import { formatParisDate } from "../../shared/parisDate";
import { loadWorkshop, workshopAccessError } from "./automaticWorkshopApi";
import WorkshopHistory from "./WorkshopHistory";
import WorkshopSettings from "./WorkshopSettings";
import { WorkshopPurchases, WorkshopToday } from "./WorkshopToday";
import WorkshopTransfer from "./WorkshopTransfer";
import "./workshopControl.css";

type Access = ReturnType<typeof workshopAccessError>;

export default function AutomaticWorkshop({ visible = true }: { visible?: boolean }) {
  const [control, setControl] = useState<WorkshopControl | null>(null);
  const [access, setAccess] = useState<Access>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  const [verifying, setVerifying] = useState(false);
  const [request, setRequest] = useState(0);
  const refresh = useCallback(() => setRequest(value => value + 1), []);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    setVerifying(visible);
  }
  const retryLoad = () => {
    if (refreshing) return;
    setRefreshing(true);
    refresh();
  };
  const handleAccess = useCallback((cause: unknown) => {
    const next = workshopAccessError(cause);
    if (next) {
      setControl(null);
      setAccess(next);
      setLoadFailed(false);
    } else {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    loadWorkshop(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setControl(result);
      setAccess(null);
      setLoadFailed(false);
    }, (cause: unknown) => {
      if (!controller.signal.aborted) handleAccess(cause);
    }).finally(() => {
      if (controller.signal.aborted) return;
      setRefreshing(false);
      setVerifying(false);
    });
    return () => controller.abort();
  }, [handleAccess, request, visible]);

  const active = visible && Boolean(control);
  const busy = control?.transfer.lastRun?.state === "running" || control?.transfer.retryRequested;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(refresh, busy ? 5_000 : 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [active, busy, refresh]);

  if (access) return <section className="panel workshop-state control-access" aria-labelledby="workshop-access">
    <LockKeyhole size={24} className="control-state-icon" aria-hidden="true" />
    <div>
      <h2 id="workshop-access">{access === "signin" ? "Connexion à Kookia" : access === "reload" ? "Session modifiée" : "Accès au suivi indisponible"}</h2>
      {access === "signin" && <p>Connectez-vous pour consulter les transferts de votre espace de test.</p>}
      {access === "reload" && <p role="alert">Rechargez la page pour retrouver votre espace.</p>}
      {access === "unavailable" && <p role="status">Ouvrez le suivi depuis l’espace de test configuré dans Kookia.</p>}
    </div>
    {access === "signin" && <a className="primary-link" href="/login?retour=atelier">Se connecter <ArrowRight size={16} aria-hidden="true" /></a>}
    {access === "reload" && <button type="button" onClick={() => window.location.reload()}>Recharger</button>}
  </section>;

  const loading = <div className="panel control-loading" role="status">
    <CalendarClock size={22} className="control-state-icon" aria-hidden="true" /> Chargement du suivi…
  </div>;
  if (!control && !loadFailed) return loading;

  const date = formatParisDate();
  const forecast = control?.forecast?.date === date ? control.forecast : null;
  return <>
    {verifying && loading}
    <div hidden={verifying}>
      <div className="automatic-workshop">
        {loadFailed && <div className="panel workshop-state control-access control-load-failure">
          <CircleAlert size={24} className="control-state-icon" aria-hidden="true" />
          <div>
            <p role="alert"><strong>{control ? "Actualisation impossible." : "Suivi des transferts indisponible."}</strong></p>
            {control && <p>Dernières données reçues affichées.</p>}
          </div>
          <button type="button" className="secondary" aria-disabled={refreshing} onClick={retryLoad}>
            <RotateCw size={16} aria-hidden="true" /> {refreshing ? "Actualisation…" : "Réessayer"}
          </button>
        </div>}
        {control && <>
          <WorkshopTransfer control={control} onRefresh={refresh} onAccessError={handleAccess} />
          <div className="workshop-overview">
            <WorkshopToday date={date} forecast={forecast} weeklyServices={control.restaurant.weeklyServices} />
            <WorkshopPurchases purchases={control.purchases} canManage={control.canManage} mode={control.restaurant.mode} />
          </div>
          <div className="workshop-overview">
            <WorkshopHistory history={control.history} canManage={control.canManage} onAccessError={handleAccess} />
            <WorkshopSettings control={control} onAccessError={handleAccess} onRefresh={refresh} onSaved={settings => {
              setControl(current => current ? { ...current, settings } : current);
              refresh();
            }} />
          </div>
        </>}
      </div>
    </div>
  </>;
}
