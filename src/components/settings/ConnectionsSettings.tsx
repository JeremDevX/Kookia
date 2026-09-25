import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../common/Badge";
import Button from "../common/Button";
import Card from "../common/Card";
import { getSources, type SourceHealth, type SourceKind } from "../../services/sourceService";

const labels: Record<SourceKind, string> = {
  pos: "Caisse et ventes",
  ticket_ocr: "Lecture de Ticket Z",
  geocoding: "Position du restaurant",
  weather: "Météo",
  events: "Événements locaux",
};

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" });

export default function ConnectionsSettings() {
  const [result, setResult] = useState<{ state: "loading" } | { state: "error"; message: string } | { state: "loaded"; sources: SourceHealth[] }>({ state: "loading" });
  const [reload, setReload] = useState(0);
  const loading = result.state === "loading";

  const retry = () => {
    if (loading) return;
    setResult({ state: "loading" });
    setReload((value) => value + 1);
  };

  useEffect(() => {
    let active = true;
    getSources().then((result) => {
      if (active) setResult({ state: "loaded", sources: result.sources });
    }, (reason: unknown) => {
      if (active) setResult({ state: "error", message: reason instanceof Error ? reason.message : "État des connexions indisponible." });
    });
    return () => { active = false; };
  }, [reload]);

  return <Card title="Sources de données">
    <p className="settings-section-intro">Aucune source automatique n'est configurée. Les imports et corrections manuels restent disponibles.</p>
    <p id="connections-status" role="status">
      {result.state === "loading" ? "Chargement de l'état des sources…" : result.state === "loaded" ? "État des sources à jour." : ""}
    </p>
    {result.state === "error" && <div role="alert"><p>{result.message}</p></div>}
    <Button type="button" variant="outline" aria-describedby="connections-status" aria-disabled={loading} onClick={retry}>
      {loading ? "Actualisation…" : result.state === "error" ? "Réessayer" : "Actualiser l’état"}
    </Button>
    {result.state === "loaded" && <ul className="connection-list" aria-label="État des sources">
      {result.sources.map((source) => <li className="integration-item" key={source.kind}>
        <div>
          <strong>{labels[source.kind]}</strong>
          {source.lastSuccessAt && <p>Dernière synchronisation réussie : {dateTime.format(new Date(source.lastSuccessAt))}</p>}
        </div>
        <Badge label={source.state === "ready" ? "Disponible" : source.state === "degraded" ? "À vérifier" : "Non connecté"}
          status={source.state === "ready" ? "optimal" : source.state === "degraded" ? "moderate" : "neutral"} />
      </li>)}
    </ul>}
    <h3>Replis manuels</h3>
    <p>Pour les ventes, utilisez l'<Link to="/sales#sales-import-title">import CSV Kookia</Link> ou la saisie manuelle.</p>
    <p>Les factures peuvent être vérifiées et réceptionnées depuis <Link to="/orders">Achats</Link>.</p>
  </Card>;
}
