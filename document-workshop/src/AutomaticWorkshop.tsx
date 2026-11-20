import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { WorkshopControl } from "../../shared/workshopControl";
import { formatParisDate } from "../../shared/parisDate";
import { loadWorkshop, workshopAccessError } from "./automaticWorkshopApi";
import WorkshopHistory from "./WorkshopHistory";
import WorkshopSettings from "./WorkshopSettings";
import { WorkshopPurchases, WorkshopToday } from "./WorkshopToday";
import WorkshopTransfer from "./WorkshopTransfer";

type Access = ReturnType<typeof workshopAccessError>;

export default function AutomaticWorkshop() {
  const [control, setControl] = useState<WorkshopControl | null>(null);
  const [access, setAccess] = useState<Access>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [request, setRequest] = useState(0);
  const refresh = useCallback(() => setRequest(value => value + 1), []);
  const handleAccess = useCallback((cause: unknown) => {
    const next = workshopAccessError(cause);
    if (next) { setControl(null); setAccess(next); }
    else setLoadFailed(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadWorkshop(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setControl(result);
      setAccess(null);
      setLoadFailed(false);
    }, (cause: unknown) => {
      if (!controller.signal.aborted) handleAccess(cause);
    });
    return () => controller.abort();
  }, [handleAccess, request]);

  const active = Boolean(control);
  const busy = control?.transfer.lastRun?.state === "running" || control?.transfer.retryRequested;
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(refresh, busy ? 5_000 : 60_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [active, busy, refresh]);

  if (access) return <section className="panel workshop-state" aria-labelledby="workshop-access">
    <div>
      <h2 id="workshop-access">{access === "signin" ? "Connexion à Kookia" : access === "reload" ? "Session modifiée" : "Atelier indisponible"}</h2>
      {access === "signin" && <p>Connectez-vous pour suivre les transferts de votre espace de test.</p>}
      {access === "reload" && <p role="alert">Rechargez la page pour retrouver votre espace.</p>}
      {access === "unavailable" && <p role="status">Le transfert automatique est réservé à l’espace de test configuré dans Kookia.</p>}
    </div>
    {access === "signin" && <a className="primary-link" href="/login?retour=atelier">Se connecter <ArrowRight size={16} aria-hidden="true" /></a>}
    {access === "reload" && <button type="button" onClick={() => window.location.reload()}>Recharger</button>}
  </section>;

  if (!control && !loadFailed) return <p className="panel" role="status">Chargement du suivi…</p>;
  const date = formatParisDate();
  const forecast = control?.forecast?.date === date ? control.forecast : null;
  return <div className="automatic-workshop">
    {loadFailed && <div className="panel workshop-state">
      <p role="alert">{control ? "Actualisation impossible." : "Suivi des transferts indisponible."}</p>
      <button type="button" className="secondary" onClick={refresh}>Réessayer</button>
    </div>}
    {control && <>
      <WorkshopTransfer control={control} onRefresh={refresh} onAccessError={handleAccess} />
      <div className="workshop-overview">
        <WorkshopToday date={date} forecast={forecast} weeklyServices={control.restaurant.weeklyServices} />
        <WorkshopPurchases purchases={control.purchases} canManage={control.canManage} />
      </div>
      <div className="workshop-overview">
        <WorkshopHistory history={control.history} canManage={control.canManage} onAccessError={handleAccess} />
        <WorkshopSettings control={control} onAccessError={handleAccess} onSaved={settings => {
          setControl(current => current ? { ...current, settings } : current);
          refresh();
        }} />
      </div>
    </>}
  </div>;
}
