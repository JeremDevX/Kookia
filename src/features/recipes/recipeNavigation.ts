export type RecipeView = "catalog" | "anti-waste" | "sheets" | "history";

export function getRecipeView(params: URLSearchParams): RecipeView {
  if (params.get("product")) return "anti-waste";
  const view = params.get("view");
  return view === "anti-waste" || view === "sheets" || view === "history" ? view : "catalog";
}

export function recipeViewParams(params: URLSearchParams, view: RecipeView): URLSearchParams {
  const next = new URLSearchParams(params);
  if (view !== "anti-waste") next.delete("product");
  if (view === "catalog") next.delete("view"); else next.set("view", view);
  return next;
}

export function recipeViewHref(params: URLSearchParams, view: RecipeView): string {
  const query = recipeViewParams(params, view).toString();
  return `/recipes${query ? `?${query}` : ""}`;
}
