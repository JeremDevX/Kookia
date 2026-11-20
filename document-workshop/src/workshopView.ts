export type WorkshopView = "automatique" | "export";

export function workshopView(location: Pick<Location, "pathname" | "search">): WorkshopView {
  const view = new URLSearchParams(location.search).get("vue");
  if (view === "automatique" || view === "export") return view;
  return location.pathname === "/generateur/" || location.pathname === "/generateur" ? "automatique" : "export";
}
