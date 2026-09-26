import { ingredientById, number, recipeById } from "./catalog";
import { weekday } from "./calendar";
import { section } from "./documentModel";
import type { WriteDocument } from "./documentModel";
import type { Day } from "./model";

export function stockDocuments(day: Day, add: WriteDocument) {
  const kinds = { preparation: "Préparation", expiry: "Échéance dépassée", spoilage: "Altération", unsold: "Surproduction", plate_return: "Retour assiette" };
  if (day.waste.length) add("waste", "Registre des pertes et déchets", day.date, "01", [
    section("Pertes BRUTES à sortir du stock", ["Produit / lot", "Quantité", "Cause"], day.waste.filter(w => w.stockEffect).map(w => [
      `${ingredientById(w.productId!).name} · ${w.lotId}`, `${number(w.quantity)} ${w.unit}`, kinds[w.kind]])),
    section("Déchets DÉJÀ INCLUS dans la production", ["Produit / recette", "Quantité", "Évitable", "Cause"], day.waste.filter(w => !w.stockEffect).map(w => [
      w.productId ? ingredientById(w.productId).name : recipeById(w.recipeId!).name,
      `${number(w.quantity)} ${w.unit === "portions" ? "éq. portions" : w.unit}`, w.avoidable ? "Oui" : "Non comestible", kinds[w.kind]])),
  ], ["Seul le premier tableau crée une sortie stock supplémentaire. Les parures sont incluses dans le dosage brut, les invendus dans le préparé, les retours dans le servi.",
    "Les équivalents-portions sont des estimations de travail. Ne pas additionner kg, L et portions ; aucun poids cuit mesuré n'est fourni."]);
  if (day.stock.some(l => l.adjustment)) add("adjustment", "Régularisation de stock", day.date, "01", [section("Écart signé de fermeture", ["Produit", "Écart", "Unité"],
    day.stock.filter(l => l.adjustment).map(l => [ingredientById(l.id).name, `${l.adjustment > 0 ? "+" : ""}${number(l.adjustment)}`, ingredientById(l.id).unit]))],
    ["Écart positif ou négatif constaté au comptage ; une seule régularisation, par ajustement OU comptage."]);
  if (weekday(day.date) === 0 || day.incident === "stock_gap") add("count", "Feuille d'inventaire", day.date, "01", [section("Comptage après clôture", ["Produit", "Quantité", "Unité"],
    day.stock.map(l => [ingredientById(l.id).name, number(l.closing), ingredientById(l.id).unit]))],
    ["Inventaire hebdomadaire ou contrôle d'écart. Ne pas rejouer une régularisation déjà appliquée."]);
  add("lots", "Lots disponibles à la clôture", day.date, "01", [section("Priorité à l'échéance la plus proche", ["Produit / lot", "Reçu le", "Échéance", "Reste"],
    [...day.closingLots].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)).map(l => [
      `${ingredientById(l.productId).name} · ${l.id}`, l.receivedOn, l.expiresOn, `${number(l.quantity)} ${ingredientById(l.productId).unit}`]))],
    ["Échéances de travail hypothétiques. Les lots sont utilisables jusqu'à la date indiquée incluse puis écartés à l'ouverture du jour suivant.",
      "Ce suivi ne remplace pas les informations sanitaires réelles des produits. La reprise conserve quantités, âge et échéances."]);
  add("ledger", "Journal matière", day.date, "01", [section("Réconciliation par unité", ["Produit", "Initial", "+ Reçu", "- Produit", "- Perdu", "+ Écart", "Final"],
    day.stock.map(l => [`${ingredientById(l.id).name} (${ingredientById(l.id).unit})`, ...[l.opening, l.received, l.consumed, l.loss, l.adjustment, l.closing].map(number)]))],
    ["Produit = matière brute de TOUTES les portions préparées. Perdu = seulement péremption et altération avant production.", ...day.events]);
}
