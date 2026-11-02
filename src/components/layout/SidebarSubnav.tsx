import { Link, useLocation } from "react-router-dom";
import { getOrderView, orderViewHref } from "../../features/orders/orderNavigation";
import { getRecipeView, recipeViewHref, type RecipeView } from "../../features/recipes/recipeNavigation";

type Section = "orders" | "receipts" | "stocks" | "analytics" | "settings" | "recipes";

export default function SidebarSubnav({ section, onNavigate }: { section: Section; onNavigate: () => void }) {
  const { pathname, search, hash } = useLocation();
  const params = new URLSearchParams(search);
  let active: string;
  let items: Array<{ id: string; label: string; href: string }>;

  if (section === "orders") {
    active = getOrderView(params, hash);
    items = [
      { id: "prepare", label: "Préparer un achat", href: orderViewHref("prepare") },
      { id: "orders", label: "Commandes et réceptions", href: orderViewHref("orders") },
      { id: "invoices", label: "Factures et documents", href: orderViewHref("invoices") },
    ];
  } else if (section === "receipts") {
    active = params.get("period") === "month" ? "month" : "week";
    items = [{ id: "week", label: "Semaine", href: "/orders?view=receipts&period=week" },
      { id: "month", label: "Mois", href: "/orders?view=receipts&period=month" }];
  } else if (section === "stocks") {
    active = params.get("stockView") === "out" ? "out" : params.get("stockView") === "review" ? "review" : params.get("stockView") === "count" ? "count" : "all";
    items = [{ id: "all", label: "Tous les produits", href: "/stocks" },
      { id: "out", label: "Ruptures confirmées", href: "/stocks?stockView=out" },
      { id: "review", label: "À traiter", href: "/stocks?stockView=review" },
      { id: "count", label: "Inventaire", href: "/stocks?stockView=count" }];
  } else if (section === "analytics") {
    const requested = params.get("view");
    active = pathname === "/predictions" ? "predictions" : hash === "#estimated-outflows-title" ? "estimates" : hash === "#impact-summary-title" ? "overview" : requested === "sales" || requested === "estimates" ? requested : "overview";
    const period = new URLSearchParams();
    for (const key of ["from", "to"]) { const value = params.get(key); if (value) period.set(key, value); }
    const href = (view: string) => { const query = new URLSearchParams(period); query.set("view", view); return `/analytics?${query}`; };
    items = [
      { id: "overview", label: "Vue d’ensemble", href: href("overview") },
      { id: "sales", label: "Ventes", href: href("sales") },
      { id: "estimates", label: "Sorties estimées", href: href("estimates") },
      { id: "predictions", label: "Prévisions", href: `/predictions${period.size ? `?${period}` : ""}` },
    ];
  } else if (section === "recipes") {
    active = getRecipeView(params);
    const views: Array<{ id: RecipeView; label: string }> = [
      { id: "catalog", label: "Toutes les recettes" }, { id: "anti-waste", label: "Réalisables avec le stock" },
      { id: "sheets", label: "Fiches techniques" }, { id: "history", label: "Produites cette semaine" },
    ];
    items = views.map(({ id, label }) => ({ id, label, href: recipeViewHref(params, id) }));
  } else {
    const requested = params.get("section");
    active = requested === "account" || requested === "suppliers" || requested === "connections" ? requested : "restaurant";
    items = [["restaurant", "Restaurant"], ["account", "Compte"], ["suppliers", "Fournisseurs"], ["connections", "Connexions"]].map(([id, label]) => {
      const query = new URLSearchParams(params); query.set("section", id);
      return { id, label, href: `/settings?${query}` };
    });
  }

  return <div className="sidebar-subnav">{items.map((item) => <Link key={item.id} to={item.href} onClick={onNavigate}
    aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "active" : ""}>{item.label}</Link>)}</div>;
}
