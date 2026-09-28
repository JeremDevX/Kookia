import { identity, ingredients, money, number, recipes, suppliers } from "./catalog";
import { available, grossDosages } from "./inventory";
import type { Scenario } from "./model";
import { section, serviceLabel } from "./documentModel";
import type { WriteDocument } from "./documentModel";
import { terraceLabel } from "./weather";

export function setupDocuments(scenario: Scenario, add: WriteDocument) {
  const { options, days, opening } = scenario;
  add("identity", "Fiche établissement", options.start, "01", [section("Maison", ["Champ", "Valeur"], [
    ["Nom", options.name], ["Cuisine", identity.type], ["Adresse", options.address], ["Ville", options.city],
    ["Contact", options.email], ["Responsable", identity.chef], ["Couverts de référence / jour ouvert", String(options.covers)],
    ["Terrasse", terraceLabel(options.hasTerrace)],
    ["Reprise", opening ? `${opening.dossier} · clôture ${opening.asOf}` : "Nouveau dossier, stock initial nul"],
  ])], ["Hypothèses de travail locales : calendrier, météo, rendements, fréquentation, prix et durées de conservation ne sont pas calibrés sur un établissement réel.",
    "Revoir le choix Terrasse dans les paramètres du restaurant. La commune météo se confirme séparément dans Kookia ; le dossier ne la configure pas."]);
  const weekdays = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  add("suppliers", "Répertoire fournisseurs", options.start, "01", [section("Approvisionnements", ["Fournisseur", "Contact", "Tournées prévues"], suppliers.map(s => [s.name, s.email, s.deliveryDays.map(d => weekdays[d]).join(", ")]))],
    ["Commande la veille de la tournée. Livraison de mise en route convenue avant le premier service ; les jours fermés peuvent recevoir une livraison."]);
  add("catalog", "Catalogue matières premières", options.start, "01", [section("Produits et ouverture", ["Produit / unité", "Prix HT indicatif", "Initial", "Pas d'achat"], ingredients.map(p => [
    `${p.name} / ${p.unit}`, money(p.price), number(available(opening?.lots ?? [], p.id)), `${number(p.packSize)} ${p.unit}`,
  ])), section("Hypothèses des lots", ["Produit", "Durée de travail", "Rendement net", "Fournisseur"], ingredients.map(p => [p.name, `${p.shelfLife} jours`, `${number(p.yield * 100)} %`, p.supplier]))],
    ["Prix réellement facturés sur chaque pièce fournisseur. Les quantités initiales d'une reprise sont déjà détenues, pas de nouvelles réceptions.",
      "Les durées et pas d'achat sont des paramètres du dossier, sans valeur de consigne sanitaire ni de conditionnement fournisseur vérifié."]);
  for (const recipe of recipes.filter(r => r.category !== "Boisson" || options.drinks)) {
    const gross = grossDosages(recipe, options.lossPercent);
    add("recipes", `Fiche technique · ${recipe.name}`, options.start, recipe.id, [
      section("Recette", ["Catégorie", "Rendement", "Préparation", "Saisonnalité"], [[recipe.category, "10 portions", `${recipe.prepTime} min`, recipe.months?.join(", ") ?? "Toute l'année"]]),
      section("Lot de 10 portions", ["Produit", "Net utilisé", "BRUT à saisir", "Unité"], Object.entries(recipe.ingredients).map(([id, net]) => {
        const p = ingredients.find(p => p.id === id)!; return [p.name, number(net), number(gross[id]), p.unit];
      })),
    ], [`Prise d'effet : ${options.start}. 1 article = 1 portion. Dosage brut arrondi à 10 g/mL par lot, soit 1 g/mL par portion.`,
      "Les pertes de préparation sont incluses dans le BRUT : ne pas les ressaisir en perte de stock.",
      opening ? "Reprise : conserver les recettes identiques. Si les rendements ont changé, créer une version datée avant production." : "Créer et revoir les fiches avant toute production."]);
  }
  add("service", "Calendrier des services", options.start, "01", [section("Europe/Paris", ["Date", "Ouverture", "Prévu / demandé", "Services"], days.map(d => [d.date,
    d.open ? "Ouvert · à revoir" : "Fermé", `${d.forecastCovers} / ${d.covers}`, d.services.map(s => serviceLabel(s.name)).join(" + ") || "—"]))],
    ["Prévu : information avant service. Demandé : fréquentation du dossier, y compris les demandes non servies. La couverture Kookia reste à confirmer après revue."]);
}
