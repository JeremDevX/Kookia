import { lazy, Suspense, useEffect, useState, type MouseEvent } from "react";
import { ArrowUpRight, CalendarClock, FolderDown } from "lucide-react";
import { workshopView, type WorkshopView } from "./workshopView";
import "./automaticWorkshop.css";

const ExportWorkshop = lazy(() => import("./ExportWorkshop"));
const AutomaticWorkshop = lazy(() => import("./AutomaticWorkshop"));

export default function App() {
  const [view, setView] = useState(() => workshopView(window.location));
  const [visitedExport, setVisitedExport] = useState(view === "export");
  useEffect(() => {
    const onPopState = () => {
      const next = workshopView(window.location);
      setView(next);
      if (next === "export") setVisitedExport(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const switchView = (event: MouseEvent<HTMLAnchorElement>, next: WorkshopView) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (view === next) return;
    window.history.pushState(null, "", event.currentTarget.href);
    setView(next);
    if (next === "export") setVisitedExport(true);
  };

  return <>
    <a href="#main" className="skip-link">Aller au contenu</a>
    <header className="masthead">
      <div className="masthead-inner">
        <div className="brand">
          <span className="mark" aria-hidden="true">K</span>
          <span>Kookia <span className="brand-context">Atelier documentaire</span></span>
        </div>
        {import.meta.env.BASE_URL === "/generateur/" && <a href="/" className="workshop-link back-link">Retour à Kookia <ArrowUpRight size={16} aria-hidden="true" /></a>}
      </div>
      <nav className="workshop-nav" aria-label="Vues de l’atelier">
        <a href="?vue=automatique" aria-current={view === "automatique" ? "page" : undefined}
          onClick={event => switchView(event, "automatique")}><CalendarClock size={18} aria-hidden="true" />Génération automatique</a>
        <a href="?vue=export" aria-current={view === "export" ? "page" : undefined}
          onClick={event => switchView(event, "export")}><FolderDown size={18} aria-hidden="true" />Dossiers à exporter</a>
      </nav>
    </header>
    <main id="main" tabIndex={-1}>
      <h1 className="page-title">{view === "automatique" ? "Génération automatique" : "Dossiers à exporter"}</h1>
      {view === "automatique" && <Suspense fallback={<p className="panel" role="status">Chargement du suivi…</p>}><AutomaticWorkshop /></Suspense>}
      {visitedExport && <div hidden={view !== "export"}>
        <Suspense fallback={<p className="panel" role="status">Chargement du dossier…</p>}><ExportWorkshop /></Suspense>
      </div>}
    </main>
  </>;
}
