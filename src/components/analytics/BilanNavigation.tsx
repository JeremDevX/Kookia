import { Link } from "react-router-dom";

type View = "overview" | "sales" | "estimates" | "predictions";

export default function BilanNavigation({ active, from, to }: { active: View; from: string; to: string }) {
  const query = (view?: string) => new URLSearchParams({ from, to, ...(view ? { view } : {}) }).toString();
  const destinations: Array<{ id: View; label: string; href: string }> = [
    { id: "overview", label: "Vue d’ensemble", href: `/analytics?${query("overview")}` },
    { id: "sales", label: "Ventes", href: `/analytics?${query("sales")}` },
    { id: "estimates", label: "Sorties estimées", href: `/analytics?${query("estimates")}` },
    { id: "predictions", label: "Prévisions", href: `/predictions?${query()}` },
  ];
  return <nav className="bilan-views" aria-label="Vues du bilan">{destinations.map(({ id, label, href }) =>
    <Link key={id} to={href} aria-current={active === id ? "page" : undefined}>{label}</Link>)}</nav>;
}
