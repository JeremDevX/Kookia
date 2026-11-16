import { Link } from "react-router-dom";
import { analyticsViewLinks, type AnalyticsView } from "../../utils/analyticsNavigation";

export default function BilanNavigation({ active, from, to }: { active: AnalyticsView; from: string; to: string }) {
  const destinations = analyticsViewLinks(new URLSearchParams({ from, to }));
  return <nav className="bilan-views" aria-label="Vues du bilan">{destinations.map(({ id, label, href }) =>
    <Link key={id} to={href} aria-current={active === id ? "page" : undefined}>{label}</Link>)}</nav>;
}
