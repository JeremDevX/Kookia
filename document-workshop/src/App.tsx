import { lazy, Suspense, useEffect, useState, type MouseEvent } from "react";
import { Monitor } from "lucide-react";
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
    <header className="masthead"><div className="masthead-inner">
      <a href="#main" className="brand"><span className="mark" aria-hidden="true">K</span>KookIA</a>
      {view === "export" && <span className="local-badge"><Monitor size={16} aria-hidden="true" />Atelier local</span>}
      {view === "automatique" && import.meta.env.BASE_URL === "/generateur/" && <a href="/" className="local-badge workshop-link">Ouvrir Kookia</a>}
    </div></header>
    <main id="main" tabIndex={-1}>
      <header className="intro">
        <h1>Atelier documentaire</h1>
        {view === "export" && <p>Préparez un dossier de restaurant avec ses recettes, livraisons et ventes, classées jour par jour.</p>}
      </header>
      <nav className="workshop-nav" aria-label="Vues de l’atelier">
        <a href="?vue=automatique" aria-current={view === "automatique" ? "page" : undefined}
          onClick={event => switchView(event, "automatique")}>Génération automatique</a>
        <a href="?vue=export" aria-current={view === "export" ? "page" : undefined}
          onClick={event => switchView(event, "export")}>Dossiers à exporter</a>
      </nav>
      {view === "automatique" && <Suspense fallback={<p role="status">Chargement de l’atelier…</p>}><AutomaticWorkshop /></Suspense>}
      {visitedExport && <div hidden={view !== "export"}>
        <Suspense fallback={<p role="status">Chargement du dossier…</p>}><ExportWorkshop /></Suspense>
      </div>}
    </main>
  </>;
}
