import { Users, Euro, TrendingUp, Leaf } from "lucide-react";

const indicators = [
  { label: "Couverts servis", value: "347", unit: "", period: "Hier · capacité de 400", detail: "+12 % vs N−1", icon: Users, tone: "sage" },
  { label: "Chiffre d’affaires", value: "4 892", unit: "€", period: "Ce mois", detail: "Activité du restaurant", icon: Euro, tone: "sand" },
  { label: "Couverts prévus", value: "420", unit: "", period: "Demain · estimation", detail: "Prévision à confirmer", icon: TrendingUp, tone: "blue" },
  { label: "Gaspillage estimé", value: "−2,3", unit: "%", period: "Cette semaine", detail: "Évolution estimée", icon: Leaf, tone: "sage" },
];

export default function DashboardKPIs() {
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
