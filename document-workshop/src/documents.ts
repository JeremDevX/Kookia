import { identity, ingredients, money, number, recipes, suppliers } from "./catalog";
import type { Scenario } from "./scenario";

export interface Section { heading: string; columns: string[]; rows: string[][] }
export interface Document {
  id: string; kind: string; title: string; date: string; issuer: string; recipient: string;
  sections: Section[]; notes: string[]; workflow: string;
}
export const workflows = {
  identity: "Paramètres → Restaurant : reprendre identité, adresse, email et couverts. Les coordonnées sont modifiables dans l'atelier.",
  suppliers: "Fournisseurs : créer les trois fiches avant les produits. Aucun email n'est envoyé par l'atelier.",
  catalog: "Stocks → Ajouter un produit : créer chaque produit avec stock initial 0, son unité, son prix HT et son fournisseur. Ne pas écraser un stock existant.",
  recipes: "Recettes → Créer : rendement 10 portions, dosages du lot, date d'effet au début de la période. Ventes → Articles : créer les mêmes noms puis associer chaque article à sa recette, 1 portion par article.",
  menu: "Menu du jour : reprendre entrée, plat et dessert puis valider le choix.",
  order: "Achats : reprendre les quantités commandées, vérifier le fournisseur puis valider. La validation seule ne réceptionne rien.",
  invoice: "Factures → Saisie manuelle : référence, date, fournisseur, produits, quantités et prix HT. L'OCR générique n'est pas actif. Pour une livraison incomplète, rapprocher la facture de la commande puis réceptionner uniquement le bon de livraison.",
  delivery: "Achats → Réception : saisir les quantités livrées et les écarts. Choisir ce flux OU la réception de facture, jamais les deux pour la même livraison.",
  credit: "Avoir à conserver et à rapprocher de la facture. Kookia ne dispose pas d'une comptabilité d'avoirs : ne pas recevoir l'avoir comme un achat ni ajouter son montant au stock.",
  production: "Recettes → Production : saisir les portions, la date et la recette/version. Une production déduit les ingrédients ; une simple note de réalisation ne le fait pas.",
  sales: "Ventes → Import CSV : utiliser ventes.csv, associer les noms d'articles, prévisualiser et confirmer. Choisir CSV OU Ticket Z OU saisie manuelle pour la même journée ; ne pas additionner ces sources.",
  ticket: "Ventes → Ticket Z : déposer le PDF, transcrire date, noms et quantités, recharger l'original pour revue puis confirmer. Sans OCR automatique. Si le CSV est déjà importé, traiter le rapprochement plutôt qu'ajouter les ventes.",
  customer: "Facture de sortie à conserver comme justificatif client. Les ventes sont déjà incluses dans le Ticket Z et le CSV ; ne pas les saisir une deuxième fois. Pas d'import de comptabilité client dans Kookia.",
  waste: "Stocks → Ajuster → Perte : saisir la quantité perdue en diminution. Kookia date ce mouvement au moment de la saisie, sans reprise de date historique ; pour un contrôle daté exact, utiliser la journée courante.",
  count: "Stocks → Comptage : saisir le stock final après réceptions, productions et pertes. Kookia date le comptage à la saisie. Ne pas déduire une seconde fois les ventes après la production.",
  service: "Ventes → Calendrier : marquer chaque date ouverte et complète après revue des ventes. Un jour absent du dossier ne doit pas être déclaré fermé ou à zéro.",
  adjustment: "Stocks → Ajuster : saisir l’écart positif indiqué OU utiliser le comptage final pour régulariser, jamais les deux. La correction est datée au moment de la saisie.",
  refund: "Ventes → Vente concernée → Remboursement : enregistrer le motif sur chacun des trois articles du repas. Kookia trace le remboursement sans modifier les quantités vendues ni réintégrer les ingrédients. Le montant reste sur cet avoir ; pas de comptabilité client importable.",
  kitchen: "Recettes → Historique : consigner la note de réalisation sans mouvement de stock ; enregistrer le refus de la production supplémentaire avec son motif. Ne pas relancer les productions déjà enregistrées.",
  ledger: "Contrôle : stock initial + réception - ingrédients produits - pertes + régularisation = stock final. Les ventes décrivent les portions déjà produites et ne constituent pas une deuxième sortie matière.",
};
const section = (heading: string, columns: string[], rows: string[][]): Section => ({ heading, columns, rows });
export function createDocuments(scenario: Scenario): Document[] {
  const { options, days } = scenario;
  const docs: Document[] = [];
  const recipient = `${options.name} · ${options.address} · ${options.city}`;
  const add = (kind: keyof typeof workflows, title: string, date: string, suffix: string, sections: Section[], notes: string[] = [], issuer = options.name, to = recipient) => {
    docs.push({ id: `${kind}-${date}-${options.seed}-${suffix}`, kind, title, date, issuer, recipient: to, sections, notes, workflow: workflows[kind] });
  };
  add("identity", "Fiche établissement", options.start, "01", [section("Maison", ["Champ", "Valeur"], [
    ["Nom", options.name], ["Cuisine", identity.type], ["Adresse", options.address], ["Ville", options.city],
    ["Contact", options.email], ["Responsable", identity.chef], ["Couverts / jour", String(options.covers)],
  ])]);
  add("suppliers", "Répertoire fournisseurs", options.start, "01", [section("Approvisionnements", ["Fournisseur", "Adresse", "Contact"], suppliers.map(s => [s.name, s.address, s.email]))]);
  add("catalog", "Catalogue matières premières", options.start, "01", [section("Création des produits", ["Produit / catégorie", "Unité", "Prix HT", "Seuil", "Fournisseur"], ingredients.map(p => [
    `${p.name} / ${p.category}`, p.unit, money(p.price), number(p.threshold), suppliers.find(s => s.id === p.supplier)!.name,
  ]))], ["Stock initial : 0 pour chaque produit. Les livraisons constituent les entrées de stock."]);
  recipes.forEach((recipe, index) => add("recipes", `Fiche technique · ${recipe.name}`, options.start, String(index + 1), [
    section("Recette", ["Catégorie", "Rendement", "Préparation", "Prise d'effet"], [[recipe.category, "10 portions", `${recipe.prepTime} min`, options.start]]),
    section("Ingrédients du lot de 10 portions", ["Produit", "Quantité", "Unité"], Object.entries(recipe.ingredients).map(([id, qty]) => {
      const ingredient = ingredients.find(p => p.id === id)!; return [ingredient.name, number(qty), ingredient.unit];
    })),
  ], ["Correspondance vente : 1 article = 1 portion. Dosages exprimés en matière utilisée, sans conversion d'unité."]));
  add("service", "Calendrier des services", options.start, "01", [section("Service midi · Europe/Paris", ["Date", "Ouverture", "Couverture", "Couverts"], days.map(d => [d.date, "Ouvert", "Complète", String(d.covers)]))]);
  for (const day of days) {
    const { date } = day;
    add("kitchen", "Journal des décisions cuisine", date, "01", [section("Suivi de service", ["Type", "Recette / portions", "Décision et motif"], [
      ["Note de réalisation", `${recipes[1].name} / ${day.sales[1]}`, "Service terminé. Production référencée sur la feuille cuisine, sans nouvelle sortie matière."],
      ["Refus", `${recipes[2].name} / 10`, "Lot supplémentaire refusé : le volume préparé couvre le service."],
    ])]);
    add("menu", "Carte du jour", date, "01", [section("Service du midi", ["Séquence", "Plat", "Prix TTC"], recipes.map(r => [r.category, r.name, money(r.price)]))]);
    for (const supplier of suppliers) {
      const lines = day.stock.filter(line => line.ordered > 0 && ingredients.find(p => p.id === line.id)!.supplier === supplier.id);
      if (!lines.length) continue;
      const reference = `${date.replaceAll("-", "")}-${options.seed}-${supplier.id}`;
      const monetaryRows = lines.map(line => {
        const p = ingredients.find(p => p.id === line.id)!;
        return [p.name, `${number(line.ordered)} ${p.unit}`, money(p.price), money(Math.round(line.ordered * p.price))];
      });
      const net = lines.reduce((total, line) => total + Math.round(line.ordered * ingredients.find(p => p.id === line.id)!.price), 0);
      const tax = Math.round(net * 0.055);
      add("order", "Bon de commande", date, supplier.id, [section(`BC-${reference}`, ["Produit", "Quantité", "PU HT", "Total HT"], monetaryRows)], ["Livraison attendue : ce jour à 08:00.", `Total HT : ${money(net)}`], options.name, supplier.name);
      add("invoice", "Facture fournisseur", date, supplier.id, [section(`FA-${reference}`, ["Désignation", "Quantité", "PU HT", "Montant HT"], monetaryRows),
        section("Récapitulatif", ["Total HT", "TVA 5,5 %", "Total TTC"], [[money(net), money(tax), money(net + tax)]])],
      [`Commande BC-${reference} · Livraison BL-${reference}`, "Règlement à réception par virement. Devise : EUR."], supplier.name, recipient);
      add("delivery", "Bon de livraison", date, supplier.id, [section(`BL-${reference}`, ["Produit", "Commandé", "Livré", "Manquant"], lines.map(line => {
        const p = ingredients.find(p => p.id === line.id)!;
        return [p.name, `${number(line.ordered)} ${p.unit}`, `${number(line.received)} ${p.unit}`, `${number(line.shortage)} ${p.unit}`];
      }))], [`Commande BC-${reference} · Facture FA-${reference}`, "Réception 08:00 · Contrôle : Camille Morel"], supplier.name, recipient);
      const missing = lines.filter(l => l.shortage > 0);
      if (missing.length) {
        const credit = missing.reduce((sum, line) => sum + Math.round(line.shortage * ingredients.find(p => p.id === line.id)!.price), 0);
        const vat = Math.round(credit * 0.055);
        add("credit", "Avoir fournisseur", date, supplier.id, [section(`AV-${reference}`, ["Produit non livré", "Quantité", "Montant HT"], missing.map(line => {
          const p = ingredients.find(p => p.id === line.id)!; return [p.name, `${number(line.shortage)} ${p.unit}`, money(-Math.round(line.shortage * p.price))];
        })), section("Montants à déduire", ["HT", "TVA 5,5 %", "TTC"], [[money(-credit), money(-vat), money(-credit - vat)]])],
        [`Annulation des quantités non livrées sur FA-${reference}. Aucune entrée de stock.`], supplier.name, recipient);
      }
    }
    add("production", "Feuille de production", date, "01", [section("Cuisine · 10:30", ["Recette", "Portions", "Rendement du lot", "Temps"], recipes.map((r, i) => [r.name, String(day.sales[i]), "10", `${r.prepTime} min`]))], ["Productions affectées au service du midi. Toutes les portions sont vendues ; pertes matières comptées séparément."]);
    add("ticket", "Ticket Z · Clôture de caisse", date, "01", [
      section("Caisse 01 · Service du midi · Clôture 15:00", ["Article", "Quantité", "PU TTC", "Total TTC"], recipes.map((r, i) => [r.name, String(day.sales[i]), money(r.price), money(day.sales[i] * r.price)])),
      section("TVA · consommation sur place", ["Base HT", "TVA 10 %", "Total TTC"], [[money(day.net), money(day.tax), money(day.collected)]]),
      section("Encaissements", ["Carte bancaire nette", "Espèces", "Total encaissé"], [[money(day.card), money(day.cash), money(day.collected)]]),
    ], [`Couverts : ${day.covers} · Annulations : 0 · Remboursements : ${money(day.refunded)}`, `Ventes avant remboursement : ${money(day.gross)}. Carte et espèces totalisent le montant encaissé après remboursement.`]);
    const customerGross = recipes.reduce((sum, r) => sum + r.price, 0);
    const customerNet = Math.round(customerGross / 1.1);
    add("customer", "Facture client · Table 04", date, "01", [section("Repas sur place · 1 couvert", ["Désignation", "Quantité", "Montant TTC"], recipes.map(r => [r.name, "1", money(r.price)])),
      section("Règlement carte bancaire", ["HT", "TVA 10 %", "TTC acquitté"], [[money(customerNet), money(customerGross - customerNet), money(customerGross)]])],
    ["Ce repas est inclus dans la clôture de caisse du jour, et non additionnel."], options.name, "Client de passage · Table 04");
    if (day.refunded) add("refund", "Avoir client · Table 04", date, "01", [section("Repas remboursé · Geste commercial", ["Article", "Quantité servie", "TTC remboursé"], recipes.map(r => [r.name, "1", money(-r.price)])),
      section("Remboursement sur carte", ["HT", "TVA 10 %", "Total TTC"], [[money(-customerNet), money(-(customerGross - customerNet)), money(-customerGross)]])],
    [`Facture client customer-${date}-${options.seed}-01. Motif : geste commercial sur le repas.`, "Les plats ont été servis : aucune annulation de quantité ni retour en stock."], options.name, "Client de passage · Table 04");
    if (day.stock.some(line => line.adjustment)) add("adjustment", "Fiche de régularisation de stock", date, "01", [section("Écart de comptage · 16:00", ["Produit", "Écart", "Motif"], day.stock.filter(line => line.adjustment).map(line => {
      const p = ingredients.find(p => p.id === line.id)!; return [p.name, `+${number(line.adjustment)} ${p.unit}`, "Écart physique constaté au comptage"];
    }))], ["Le stock final intègre cette régularisation. Une seule validation : ajustement OU comptage."]);
    add("waste", "Registre des pertes matières", date, "01", [section("Cuisine · 15:15", ["Produit", "Perte", "Motif", "Coût HT"], day.stock.map(line => {
      const p = ingredients.find(p => p.id === line.id)!;
      return [p.name, `${number(line.loss)} ${p.unit}`, day.incident === "high_waste" ? "Altération / tri cuisine" : "Parures / préparation", money(Math.round(line.loss * p.price))];
    }))], ["Responsable : Camille Morel. Matières écartées en complément des dosages utilisés en production."]);
    add("count", "Feuille d'inventaire", date, "01", [section("Comptage de fermeture · 16:00", ["Produit", "Quantité comptée", "Unité"], day.stock.map(line => {
      const p = ingredients.find(p => p.id === line.id)!; return [p.name, number(line.closing), p.unit];
    }))], ["Responsable : Camille Morel. Comptage après réception, production et pertes."]);
    add("ledger", "Journal matière", date, "01", [section("Réconciliation par unité", ["Produit", "Initial", "+ Reçu", "- Produit", "- Perdu", "+ Écart", "Final"], day.stock.map(line => {
      const p = ingredients.find(p => p.id === line.id)!;
      return [`${p.name} (${p.unit})`, ...[line.opening, line.received, line.consumed, line.loss, line.adjustment, line.closing].map(number)];
    }))]);
  }
  return docs;
}

export function salesCsv(scenario: Scenario) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return "service_date,item_name,quantity\r\n" + scenario.days.flatMap(day => recipes.map((recipe, index) =>
    `${day.date},${quote(recipe.name)},${day.sales[index]}`)).join("\r\n") + "\r\n";
}
