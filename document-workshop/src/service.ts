import { quantity, recipeById } from "./catalog";
import type { Recipe } from "./catalog";
import { draw, expectedCovers, forecastPortions, menuFor, salePrice } from "./calendar";
import { prepare } from "./inventory";
import type { Day, Lot, Options, RecipeRun, Service, ServiceName } from "./model";
import { buildTransactions } from "./till";

function customerRequests(date: string, name: ServiceName, menu: Recipe[], forecast: number, options: Options, incident: Day["incident"]) {
  const key = `${date}:${name}`, error = (draw(options.seed, `${key}:demand`) * 2 - 1) * options.variationPercent / 100;
  const shock = incident === "demand_shift" ? (draw(options.seed, `${key}:shock`) < .5 ? .6 : 1.5) : 1;
  const covers = Math.max(0, Math.round(forecast * (1 + error) * shock));
  const starter = menu.find(r => r.category === "Entrée")!, dessert = menu.find(r => r.category === "Dessert")!;
  const mains = menu.filter(r => r.category === "Plat");
  const meatShare = .6 + (draw(options.seed, `${key}:popularity`) - .5) * .3;
  return Array.from({ length: covers }, (_, index) => [
    ...(draw(options.seed, `${key}:${index}:starter`) < options.starterPercent / 100 ? [starter.id] : []),
    mains[draw(options.seed, `${key}:${index}:main`) < meatShare ? 0 : 1].id,
    ...(draw(options.seed, `${key}:${index}:dessert`) < options.dessertPercent / 100 ? [dessert.id] : []),
    ...(options.drinks && draw(options.seed, `${key}:${index}:coffee`) < .55 ? ["expresso"] : []),
  ]);
}
export function runService(day: Day, name: ServiceName, lots: Lot[], options: Options): Service {
  const forecastCovers = expectedCovers(day.date, name, options), menu = menuFor(day.date, name, options);
  const service: Service = { name, forecastCovers, covers: 0, runs: [], decisions: [], transactions: [] };
  const prepTime = name === "lunch" ? "10:30" : "18:00";
  // The initial kitchen decision depends exclusively on the forecast and physical stock.
  for (const recipe of menu) {
    const { forecast, planned } = forecastPortions(recipe, forecastCovers, options);
    const prepared = recipe.category === "Boisson" ? 0 : prepare(lots, recipe, planned, options, day, name);
    service.runs.push({ recipeId: recipe.id, forecast, planned, prepared, extraPrepared: 0, demand: 0, sold: 0,
      unsold: 0, unserved: 0, substitutedIn: 0, substitutedOut: 0, plateReturns: 0, price: salePrice(recipe, day.date) });
    if (prepared) service.decisions.push({ time: prepTime, recipeId: recipe.id, kind: "prepare", portions: prepared,
      reason: `${forecast} portions prévues, lot de ${recipe.batch}. Matières réservées sur les lots les plus proches de l'échéance.` });
    if (prepared < planned && recipe.category !== "Boisson") service.decisions.push({ time: prepTime, recipeId: recipe.id,
      kind: "refusal", portions: planned - prepared, reason: "Matières insuffisantes après réception et tri. Le complément n'est pas préparé." });
  }
  const requests = customerRequests(day.date, name, menu, forecastCovers, options, day.incident);
  service.covers = requests.length;
  const byId = new Map(service.runs.map(r => [r.recipeId, r]));
  const served = requests.map((dishes, index) => dishes.flatMap(recipeId => {
    const run = byId.get(recipeId)!, recipe = recipeById(recipeId);
    run.demand++;
    if (run.prepared === run.sold) {
      // Replenish only when a customer actually asks; never buy to erase a shortage.
      const limit = recipe.category === "Boisson" ? 1 : Math.max(0, Math.ceil(run.planned * .2) - run.extraPrepared);
      if (recipe.prepTime <= 30 && limit > 0) {
        const additional = prepare(lots, recipe, Math.min(recipe.batch, limit), options, day, name);
        run.prepared += additional; run.extraPrepared += additional;
      }
    }
    if (run.prepared > run.sold) { run.sold++; return [recipeId]; }
    const alternative = service.runs.find(r => r.recipeId !== recipeId && recipeById(r.recipeId).category === "Plat" && r.prepared > r.sold);
    if (recipe.category === "Plat" && alternative && draw(options.seed, `${day.date}:${name}:${index}:accept-alternative`) < .7) {
      run.substitutedOut++; alternative.substitutedIn++; alternative.sold++;
      return [alternative.recipeId];
    }
    run.unserved++; return [];
  }));
  for (const run of service.runs) finishRun(run, service, day, options);
  service.transactions = buildTransactions(served, day.date, name, options);
  return service;
}
function finishRun(run: RecipeRun, service: Service, day: Day, options: Options) {
  const recipe = recipeById(run.recipeId), during = service.name === "lunch" ? "13:00" : "20:00";
  run.unsold = run.prepared - run.sold;
  if (run.extraPrepared) service.decisions.push({ time: during, recipeId: run.recipeId, kind: "top_up", portions: run.extraPrepared,
    reason: recipe.category === "Boisson" ? "Préparation à la commande, selon les demandes reçues." : "Complément limité lancé à la demande pendant le service, dans la limite des matières et du temps disponibles." });
  if (run.substitutedOut) service.decisions.push({ time: during, recipeId: run.recipeId, kind: "substitute", portions: run.substitutedOut,
    reason: "Clients ayant accepté l'autre plat encore disponible ; ventes enregistrées sur le plat réellement servi." });
  if (run.unserved) service.decisions.push({ time: during, recipeId: run.recipeId, kind: "refusal", portions: run.unserved,
    reason: "Demande non servie : préparation épuisée, complément impossible ou substitution refusée." });
  if (recipe.category !== "Boisson") run.plateReturns = quantity(run.sold * (.015 + draw(options.seed, `${day.date}:${service.name}:${recipe.id}:plate`) * .055 + options.lossPercent / 100 * .1));
  if (run.unsold) day.waste.push({ kind: "unsold", recipeId: recipe.id, service: service.name, quantity: run.unsold, unit: "portions",
    avoidable: true, stockEffect: false, note: "Surproduction écartée à la fin du service ; ingrédients déjà sortis lors de la production, aucune seconde déduction." });
  if (run.plateReturns) day.waste.push({ kind: "plate_return", recipeId: recipe.id, service: service.name, quantity: run.plateReturns, unit: "portions",
    avoidable: true, stockEffect: false, note: "Estimation en équivalents-portions des retours d'assiette. Inclus dans les portions servies ; pas un poids mesuré ni une sortie matière supplémentaire." });
}
