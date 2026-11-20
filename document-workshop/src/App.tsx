import { lazy, Suspense, useCallback, useEffect, useState, type MouseEvent } from "react";
import { ArrowUpRight, CalendarClock, FolderDown } from "lucide-react";
import mark from "../../public/kookia-mark.svg?no-inline";
import { workshopView, type WorkshopView } from "./workshopView";
import "./automaticWorkshop.css";

const ExportWorkshop = lazy(() => import("./ExportWorkshop"));
const AutomaticWorkshop = lazy(() => import("./AutomaticWorkshop"));

const views = {
  automatique: { label: "Génération automatique", icon: CalendarClock },
  export: { label: "Dossiers à exporter", icon: FolderDown },
} satisfies Record<WorkshopView, { label: string; icon: typeof CalendarClock }>;

export default function App() {
  const [view, setView] = useState(() => workshopView(window.location));
  const [visited, setVisited] = useState(() => ({ automatique: view === "automatique", export: view === "export" }));
  const show = useCallback((next: WorkshopView) => {
    setView(next);
    setVisited(previous => previous[next] ? previous : { ...previous, [next]: true });
  }, []);

  useEffect(() => {
    const onPopState = () => show(workshopView(window.location));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [show]);

  useEffect(() => {
    document.title = `${views[view].label} · Kookia`;
  }, [view]);

  const switchView = (event: MouseEvent<HTMLAnchorElement>, next: WorkshopView) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (view === next) return;
    window.history.pushState(null, "", event.currentTarget.href);
    show(next);
    window.scrollTo(0, 0);
  };

  const deployed = import.meta.env.BASE_URL === "/generateur/";
  const brand = <><img src={mark} alt="" className="mark" /><span>Kookia</span></>;

  return <>
    <link rel="icon" type="image/svg+xml" href={mark} />
    <a href="#main" className="skip-link">Aller au contenu</a>
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          {deployed
            ? <a className="brand-home" href="/" aria-label="Retour à Kookia">{brand}<ArrowUpRight size={14} aria-hidden="true" /></a>
            : <span className="brand-home">{brand}</span>}
          <span className="brand-context">Atelier documentaire</span>
        </div>
        <nav className="workshop-nav" aria-label="Vues de l’atelier">
          {(Object.entries(views) as [WorkshopView, typeof views[WorkshopView]][]).map(([key, { label, icon: Icon }]) =>
            <a key={key} href={`?vue=${key}`} aria-current={view === key ? "page" : undefined} onClick={event => switchView(event, key)}>
              <Icon size={17} aria-hidden="true" />{label}
            </a>)}
        </nav>
      </div>
    </header>
    <main id="main" tabIndex={-1}>
      <h1 className="page-title">{views[view].label}</h1>
      {visited.automatique && <div hidden={view !== "automatique"}>
        <Suspense fallback={<p className="panel workshop-loading" role="status">Chargement du suivi…</p>}>
          <AutomaticWorkshop visible={view === "automatique"} />
        </Suspense>
      </div>}
      {visited.export && <div hidden={view !== "export"}>
        <Suspense fallback={<p className="panel workshop-loading" role="status">Chargement du dossier…</p>}><ExportWorkshop /></Suspense>
      </div>}
    </main>
  </>;
}
