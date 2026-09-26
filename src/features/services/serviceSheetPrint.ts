import type { ServiceSheet } from "../../../shared/serviceSheet";
import { serviceSlotLabels } from "../../../shared/serviceCalendar";
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const number = (value: number | null) => value === null ? "Inconnu" : String(value);
export function serviceSheetHtml(sheet: ServiceSheet) {
  const facts = sheet.closureFacts ?? sheet.facts;
  const state = sheet.state === "closed" ? "Clôturé" : sheet.state === "validated" ? "Plan validé par le chef" : "Brouillon, non validé";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fiche de service ${escape(sheet.serviceDate)} ${escape(serviceSlotLabels[sheet.slot])}</title><style>
body{font:14px Arial,sans-serif;color:#18201d;margin:28px;line-height:1.45}h1{font-size:24px}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #a7b4ad;padding:7px;text-align:left}th{background:#edf2ee}small{color:#394d42}.notice{border:1px solid #718b78;padding:12px}tr{break-inside:avoid}button{padding:10px;margin-bottom:15px}@page{size:A4 landscape;margin:12mm}@media print{button{display:none}body{margin:0}}
</style></head><body><button type="button" onclick="window.print()">Imprimer / enregistrer en PDF</button>
<h1>Fiche de service · ${escape(sheet.serviceDate)} · ${escape(serviceSlotLabels[sheet.slot])}</h1>
<p>${escape(state)} · révision ${sheet.revision} · carte de référence ${sheet.menuRevision}</p>
<p>Provenance du plan : ${sheet.forecastKey ? "estimations reprises puis revues par le chef" : "saisie manuelle"}.</p>
${sheet.forecastReference ? `<ul>${sheet.forecastReference.items.map(item => `<li>${escape(item.name)} : ${number(item.quantity)} unités estimées, modèle ${escape(item.model)}, ${item.observations} observations.</li>`).join("")}</ul>` : ""}
${sheet.validatedAt ? `<p>Plan validé le ${escape(sheet.validatedAt)}. La validation du plan ne constitue pas un mouvement de stock.</p>` : ""}
${sheet.closedAt ? `<p>Clôture le ${escape(sheet.closedAt)}. Les observations ci-dessous sont le constat conservé à la clôture.</p>` : ""}
${sheet.factsChangedSinceClosure ? '<p class="notice">Des opérations ont changé depuis la clôture. Le constat imprimé reste celui de la clôture ; consulter le rapprochement courant dans Kookia.</p>' : ""}
<table><thead><tr><th>Recette</th><th>Prévu / ajusté</th><th>Préparé</th><th>Complément</th><th>Vendu</th><th>Invendu</th><th>Conservé</th><th>Écarté déclaré</th><th>À rapprocher</th></tr></thead><tbody>${facts.lines.map(line => `<tr><th scope="row">${escape(line.recipeName)}</th><td>${line.planned} / ${line.adjustedPlanned}</td><td>${line.prepared}</td><td>${line.additionalPrepared}</td><td>${number(line.sold)}</td><td>${number(line.unsold)}</td><td>${line.retained}</td><td>${line.discarded}</td><td>${number(line.unexplained)}</td></tr>`).join("")}</tbody></table>
<p>Les quantités sont des portions de recette. Les formules sont décomposées une seule fois par recette composante. Préparé moins vendu n’est jamais assimilé automatiquement au gaspillage. Les pertes d’invendus n’entraînent pas une seconde déduction des matières déjà consommées.</p>
${facts.gaps.length ? `<h2>Données à compléter</h2><ul>${facts.gaps.map(gap => `<li>${escape(gap)}</li>`).join("")}</ul>` : ""}
<h2>Écarts et pertes</h2><ul>${facts.lines.flatMap(line => [...line.explanation.map(note => `<li>${escape(line.recipeName)} : ${escape(note)}</li>`),
  ...(line.refused ? [`<li>${escape(line.recipeName)} : ${line.refused} demandes non servies, distinctes des ventes et des pertes.</li>`] : []),
  ...line.preparationLosses.map(loss => `<li>${escape(line.recipeName)} : perte de préparation ${loss.quantity} ${escape(loss.unit)}, séparée du rendement en portions.</li>`),
  ...(line.plateReturns ? [`<li>${escape(line.recipeName)} : ${line.plateReturns} retours d’assiette, déjà inclus dans les portions vendues.</li>`] : [])]).join("") || "<li>Aucun écart renseigné.</li>"}</ul>
${facts.unallocatedRefusals ? `<p>${facts.unallocatedRefusals} demandes non servies de la journée restent non ventilées ; elles ne sont pas attribuées à ce service.</p>` : ""}
<h2>Substitutions</h2><ul>${sheet.substitutions.map(substitution => {
    const from = facts.lines.find(line => line.recipeId === substitution.fromRecipeId)?.recipeName ?? substitution.fromRecipeId;
    const to = facts.lines.find(line => line.recipeId === substitution.toRecipeId)?.recipeName ?? substitution.toRecipeId;
    return `<li>${escape(from)} → ${escape(to)} : ${substitution.portions} portions. ${escape(substitution.note)}</li>`;
  }).join("") || "<li>Aucune substitution renseignée.</li>"}</ul>
<h2>Contexte</h2><p>${escape(sheet.note) || "Non renseigné."}</p>
<h2>Remboursements monétaires signalés dans la journée</h2>
<p>Service non ventilé : aucune attribution à midi ou soir n’est supposée. Les montants ne sont pas renseignés et ces signalements ne modifient ni les quantités servies ni le stock.</p>
<ul>${facts.dailyRefunds.map(refund => `<li>${escape(refund.saleItemName)} · ${escape(refund.serviceDate)} · signalé le ${escape(refund.recordedAt)} · référence ${escape(refund.id)}${refund.saleId ? ` · vente ${escape(refund.saleId)}` : ""}. ${escape(refund.reason)}</li>`).join("") || "<li>Aucun signalement rattaché à cette journée.</li>"}</ul>
<small>Traçabilité : ${facts.productionIds.length} productions, ${facts.saleRevisions.length} lignes de ventes ventilées, ${facts.wasteIds.length} pertes rapprochées.</small>
</body></html>`;
}
export function downloadServiceSheetPrint(sheet: ServiceSheet) {
  const url = URL.createObjectURL(new Blob([serviceSheetHtml(sheet)], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `fiche-service-${sheet.serviceDate}-${sheet.slot}.html`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
