import type { StockCountSummary } from "../../types";

interface StockCountHistoryProps { counts: StockCountSummary[]; error: string; }

export default function StockCountHistory({ counts, error }: StockCountHistoryProps) {
  return <section className="drawer-section">
    <h3 className="section-heading">Historique des comptages</h3>
    <div className="history-list">
      {error ? <p role="alert">{error}</p> : counts.length === 0 ? <p>Aucun comptage enregistré. Le stock théorique est à vérifier.</p> : counts.map((count) => (
        <div className="history-item" key={count.id}>
          <span className="date">{count.countDate}</span>
          <span className="action">Compté {count.countedQuantity} {count.unit} · théorique {count.theoreticalQuantity} {count.unit} · écart {count.delta > 0 ? "+" : ""}{count.delta} {count.unit}</span>
          <small>Enregistré par le compte connecté · {new Date(count.countedAt).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })} (Europe/Paris)</small>
        </div>
      ))}
    </div>
  </section>;
}
