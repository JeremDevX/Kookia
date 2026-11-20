import { useCallback, useEffect, useState } from "react";
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

  if (access) return <section className="panel workshop-structured" aria-labelledby="workshop-access">
    <h2 id="workshop-access">Accès à la génération automatique</h2>
    {access === "signin" && <><p role="status">Connectez-vous à Kookia pour ouvrir l’atelier de votre espace de test.</p>
      <a className="workshop-link" href="/login?retour=atelier">Se connecter à Kookia</a></>}
    {access === "reload" && <><p role="alert">Votre session Kookia a changé. Rechargez la page avant de poursuivre.</p>
      <div><button type="button" onClick={() => window.location.reload()}>Recharger la page</button></div></>}
    {access === "unavailable" && <p role="status">Le transfert automatique est réservé à l’espace de test configuré dans Kookia.</p>}
  </section>;

  if (!control && !loadFailed) return <p role="status">Vérification du transfert…</p>;
  const date = formatParisDate();
  const forecast = control?.forecast?.date === date ? control.forecast : null;
  return <div className="automatic-workshop">
    {loadFailed && <div className="panel workshop-structured">
      <p role="alert" className="error">L’atelier automatique n’a pas pu être actualisé. Ouvrez le générateur depuis l’espace Kookia configuré ou réessayez.</p>
      <div><button type="button" className="secondary" onClick={refresh}>Actualiser l’atelier</button></div>
    </div>}
    {control && <>
      <WorkshopTransfer control={{ ...control, forecast }} onRefresh={refresh} onAccessError={handleAccess} />
      <WorkshopToday date={date} forecast={forecast} weeklyServices={control.restaurant.weeklyServices} />
      <WorkshopPurchases purchases={control.purchases} />
      <WorkshopHistory history={control.history} canManage={control.canManage} onAccessError={handleAccess} />
      <WorkshopSettings control={control} onAccessError={handleAccess} onSaved={settings => {
        setControl(current => current ? { ...current, settings } : current);
        refresh();
      }} />
    </>}
  </div>;
}
