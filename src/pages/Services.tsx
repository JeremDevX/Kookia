import { useEffect, useState } from "react";
import { Link, useBlocker, useSearchParams } from "react-router-dom";
import type { ServiceSlot } from "../../shared/serviceCalendar";
import ServiceMenuEditor from "../components/services/ServiceMenuEditor";
import ServiceForecastPanel from "../components/services/ServiceForecastPanel";
import ServiceSheetPanel from "../components/services/ServiceSheetPanel";
import OperationalIncidents from "../components/services/OperationalIncidents";
import { useSharedServiceWeather } from "../features/services/weather.context";
import { serviceContextHref } from "../features/services/serviceNavigation";
import "../styles/Workspace.css";
import "./Sales.css";

export default function Services() {
  const [, setParams] = useSearchParams();
  const { service: { date, slot }, state: weather } = useSharedServiceWeather();
  const [sheetDirty, setSheetDirty] = useState(false);
  const [menuDirty, setMenuDirty] = useState(false);
  const dirty = sheetDirty || menuDirty;
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("Les modifications non enregistrées de la carte ou de la fiche seront perdues. Quitter cette page ?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const select = (nextDate: string, nextSlot: ServiceSlot) => {
    setParams({ serviceDate: nextDate, serviceSlot: nextSlot });
  };
  const [revision, setRevision] = useState(0);
  const serviceKey = `${date}:${slot}`;
  return <div className="workspace-page service-page">
    <header className="workspace-header"><div><h1>Services et carte</h1><p className="workspace-subtitle">Préparer, suivre et clôturer chaque service sans confondre estimation et opération enregistrée.</p></div></header>
    <section className="sales-panel" aria-label="Service sélectionné"><div className="sales-form">
      <label>Date du service<input required type="date" value={date} onChange={e => { if (e.target.value) select(e.target.value, slot); }} /></label>
      <label>Service<select value={slot} onChange={e => select(date, e.target.value as ServiceSlot)}><option value="lunch">Midi</option><option value="dinner">Soir</option></select></label>
    </div><p><Link to={serviceContextHref("/settings", { date, slot })}>Régler les horaires hebdomadaires</Link> · <Link to="/sales">Déclarer une fermeture exceptionnelle et qualifier les ventes</Link></p></section>
    <ServiceMenuEditor key={`menu:${serviceKey}`} date={date} slot={slot} onDirtyChange={setMenuDirty} onChanged={() => setRevision(n => n + 1)} />
    <ServiceForecastPanel key={`forecast:${serviceKey}:${revision}`} date={date} slot={slot} />
    <ServiceSheetPanel key={`sheet:${serviceKey}`} date={date} slot={slot} onDirtyChange={setSheetDirty} menuChange={revision} weatherContextRef={weather.weather?.contextRef ?? undefined} />
    <OperationalIncidents key={`incidents:${serviceKey}`} date={date} slot={slot} />
  </div>;
}
