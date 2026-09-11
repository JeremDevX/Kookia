import { Users, Euro, TrendingUp, Leaf } from "lucide-react";

import { useEffect, useState } from "react";
import { getInsights, type Insights } from "../../services/insightsService";
const presentation = { covers: { icon: Users, tone: "sage" }, revenue: { icon: Euro, tone: "sand" }, forecast: { icon: TrendingUp, tone: "blue" }, waste: { icon: Leaf, tone: "sage" } };
export default function DashboardKPIs() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getInsights().then((data) => { if (active) setData(data); }, () => { if (active) setError("Indicateurs indisponibles."); });
    return () => { active = false; };
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Chargement des indicateurs…</p>;
  const indicators = data.indicators.map((item) => ({ ...item, ...presentation[item.id] }));
  return (
    <div className="kpi-grid">
      {indicators.map(({ label, value, unit, period, detail, icon: Icon, tone }) => (
        <article className="dashboard-kpi" key={label}>
          <div className="kpi-heading"><span>{label}</span><span className={`kpi-symbol ${tone}`}><Icon size={19} aria-hidden="true" /></span></div>
          <p className="kpi-number">{value}<span>{unit}</span></p>
          <p className="kpi-period">{period}</p>
          <div className="kpi-footer">{detail}</div>
        </article>
      ))}
    </div>
  );
}
