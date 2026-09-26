import { money, number, recipeById } from "./catalog";
import { section, serviceLabel } from "./documentModel";
import type { WriteDocument } from "./documentModel";
import type { Day, Scenario } from "./model";

export function dailySales(day: Day) {
  const quantities = new Map<string, number>();
  for (const service of day.services) for (const transaction of service.transactions) for (const line of transaction.lines) {
    quantities.set(line.recipeId, (quantities.get(line.recipeId) ?? 0) + line.quantity);
  }
  return [...quantities.entries()].map(([recipeId, sold]) => ({ recipeId, sold }));
}
export function serviceDocuments(scenario: Scenario, day: Day, add: WriteDocument) {
  if (!day.open) return;
  const { date } = day;
  add("forecast", "Prévision et plan de préparation", date, "01", day.services.map(s => section(`${serviceLabel(s.name)} · ${s.forecastCovers} couverts prévus`,
    ["Recette", "Prévu", "Planifié", "Lot"], s.runs.map(r => [recipeById(r.recipeId).name, String(r.forecast), String(r.planned), String(recipeById(r.recipeId).batch)]))),
    ["Plan établi avant connaissance de la fréquentation et des incidents du service. Café préparé à la commande. Les lots de préparation arrondissent les besoins."]);
  add("menu", "Carte du jour", date, "01", day.services.map(s => section(`Service ${serviceLabel(s.name).toLowerCase()}`, ["Séquence", "Choix", "Prix TTC"],
    s.runs.map(r => [recipeById(r.recipeId).category, recipeById(r.recipeId).name, money(r.price)]))),
    [scenario.options.mealDeals ? "Midi : réduction de 2,00 EUR sur l'entrée ou le dessert avec un plat, une réduction par couvert. Appliquée sur les transactions." : "Carte à l'unité, sans formule.",
      "Disponibilité sous réserve des matières et des quantités préparées. Les deux plats sont des alternatives, pas deux plats par couvert."]);
  add("production", "Feuille de production", date, "01", day.services.map(s => section(`Cuisine · ${serviceLabel(s.name)}`, ["Recette", "Initial", "+ Service", "TOTAL préparé"],
    s.runs.filter(r => r.prepared > 0).map(r => [recipeById(r.recipeId).name, String(r.prepared - r.extraPrepared), String(r.extraPrepared), String(r.prepared)]))),
    ["Saisir le TOTAL préparé, invendus compris. Les fiches techniques donnent les dosages BRUTS ; parures et invendus ne sont pas déduits une seconde fois."]);
  add("kitchen", "Journal des décisions cuisine", date, "01", day.services.map(s => section(serviceLabel(s.name), ["Heure / décision", "Recette / portions", "Motif"],
    s.decisions.map(d => [`${d.time} · ${{ prepare: "Préparation", top_up: "Complément", refusal: "Refus", substitute: "Substitution" }[d.kind]}`,
      `${d.recipeId ? recipeById(d.recipeId).name : "Service"} / ${d.portions}`, d.reason]))), day.events);
  const transactions = day.services.flatMap(s => s.transactions);
  add("ticket", "Ticket Z", date, "01", [
    section("Articles / journée", ["Article", "Qté", "Brut TTC"], dailySales(day).map(({ recipeId, sold }) => {
      const gross = transactions.flatMap(t => t.lines).filter(l => l.recipeId === recipeId).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
      return [recipeById(recipeId).name, String(sold), money(gross)];
    })),
    section("Clôture", ["Libellé", "EUR"], [["Brut articles", money(day.gross)], ["Remises formules", money(-day.discount)], ["Remboursements", money(-day.refunded)],
      ["Net encaissé TTC", money(day.collected)], ["Base HT nette", money(day.net)], ["TVA 10 % nette", money(day.tax)], ["Carte nette", money(day.card)], ["Espèces nettes", money(day.cash)]]),
    section("Services", ["Service", "Demandés", "Tickets"], day.services.map(s => [serviceLabel(s.name), String(s.covers), String(s.transactions.length)])),
  ], [`Caisse 01 · Clôture ${scenario.options.services === "lunch" ? "15:00" : "23:00"} · ${transactions.length} tickets.`,
    "TVA calculée par transaction, puis sommée. Les remboursements n'annulent pas les quantités servies.",
    ...(!transactions.length ? ["Journée ouverte sans vente : aucun CSV à importer, couverture à revoir dans le calendrier."] : [])], { style: "receipt" });
  for (const t of transactions.filter(t => t.invoiceRequested)) {
    const customer = { recipient: `Client de passage · Table ${t.table}` };
    add("customer", `Facture client · Table ${t.table}`, date, t.id, [section(`${t.id} · ${t.time} · ${t.covers} couvert(s)`, ["Désignation", "Qté", "Remise", "TTC"],
      t.lines.map(l => [recipeById(l.recipeId).name, String(l.quantity), money(l.discount), money(l.total)])),
    section(t.payment === "card" ? "Règlement carte" : "Règlement espèces", ["HT", "TVA 10 %", "TTC"], [[money(t.net), money(t.tax), money(t.total)]])],
    ["Transaction déjà incluse dans le Ticket Z et le CSV ; aucune vente additionnelle."], customer);
    if (t.refund && t.refundRecipeId) add("refund", `Avoir client · Table ${t.table}`, date, t.id, [section(`Remboursement de ${t.id}`, ["Article servi", "Quantité", "TTC remboursé"],
      [[recipeById(t.refundRecipeId).name, "1", money(-t.refund)]]), section(`Retour sur ${t.payment === "card" ? "carte" : "espèces"}`, ["HT", "TVA", "TTC"],
      [[money(-t.refundNet), money(-(t.refund - t.refundNet)), money(-t.refund)]])], [t.refundReason!], customer);
  }
  add("sales", "Bilan du service", date, "01", day.services.map(s => section(serviceLabel(s.name), ["Article", "Demandé", "Préparé", "Vendu", "Invendu", "Non servi"],
    s.runs.map(r => [recipeById(r.recipeId).name, String(r.demand), String(r.prepared), String(r.sold), String(r.unsold), String(r.unserved)]))),
    ["Les substitutions déplacent des demandes entre plats ; le CSV suit uniquement les articles réellement servis.",
      `Retours d'assiette : ${number(day.waste.filter(w => w.kind === "plate_return").reduce((sum, w) => sum + w.quantity, 0))} équivalents-portions estimés, pas un poids mesuré.`]);
}
