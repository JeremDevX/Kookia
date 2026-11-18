import { ingredientById, money, number, suppliers } from "./catalog";
import { section } from "./documentModel";
import type { WriteDocument } from "./documentModel";
import type { Scenario } from "./model";
import { purchaseReferences, receivedLot } from "./purchasing";

export function purchaseDocuments(scenario: Scenario, add: WriteDocument) {
  for (const purchase of scenario.purchases) {
    const supplier = suppliers.find(s => s.id === purchase.supplierId)!;
    const { suffix, invoiceReference: invoice, deliveryReference: delivery } = purchaseReferences(purchase.id);
    const rows = purchase.lines.map(l => {
      const p = ingredientById(l.productId);
      return [p.name, `${number(l.ordered)} ${p.unit}`, money(l.unitPrice), money(Math.round(l.ordered * l.unitPrice))];
    });
    const net = purchase.lines.reduce((sum, l) => sum + Math.round(l.ordered * l.unitPrice), 0), tax = Math.round(net * .055);
    const note = purchase.placedOn < scenario.options.start && scenario.opening ? "Commande reprise du dossier précédent : ne pas la recréer." : purchase.note;
    add("order", "Bon de commande", purchase.placedOn, suffix, [section(purchase.id, ["Produit", "Commandé", "PU HT", "Total HT"], rows)],
      [note, `Livraison attendue le ${purchase.expectedOn}. Total HT : ${money(net)}.`,
        !purchase.receivedOn ? `En attente à la clôture ; prochaine livraison prévue le ${purchase.deliveryOn}. Aucun stock crédité.` : `Livraison rapprochée : ${delivery}.`],
      { recipient: supplier.name });
    const { receivedOn, invoiceOn } = purchase;
    if (!receivedOn || !invoiceOn) continue;
    const lots = purchase.lines.filter(line => line.received > 0).map(line => receivedLot(purchase.id, line, receivedOn));
    const parties = { issuer: `${supplier.name} · ${supplier.address}`, style: supplier.style };
    add("delivery", "Bon de livraison", receivedOn, suffix, [section(delivery, ["Produit", "Commandé", "Reçu", "Manquant"], purchase.lines.map(l => {
      const p = ingredientById(l.productId); return [p.name, `${number(l.ordered)} ${p.unit}`, `${number(l.received)} ${p.unit}`, `${number(l.shortage)} ${p.unit}`];
    })), ...(lots.length ? [section("Lots reçus", ["Produit", "Référence du dossier", "Échéance"], lots.map(lot =>
      [ingredientById(lot.productId).name, lot.id, lot.expiresOn]))] : [])],
    [`Commande ${purchase.id} du ${purchase.placedOn}. Attendue le ${purchase.expectedOn} ; reçue le ${receivedOn} à ${purchase.time}.`,
      `Facture ${invoice} datée du ${invoiceOn}. Contrôle : ${scenario.options.name}.`,
      ...(lots.length ? ["Les échéances sont des hypothèses de travail du dossier."] : []),
      ...(purchase.delayed ? ["Retard de tournée : les matières n'étaient pas disponibles à la date initialement prévue."] : [])], parties);
    add("invoice", "Facture fournisseur", invoiceOn, suffix, [section(invoice, ["Désignation", "Quantité", "PU HT", "Montant HT"], rows),
      section("Récapitulatif EUR", ["Total HT", "TVA 5,5 %", "Total TTC"], [[money(net), money(tax), money(net + tax)]])],
      [`Commande ${purchase.id} · Livraison ${delivery} du ${receivedOn}.`,
        supplier.id === "EPIC" ? "Règlement par virement à 30 jours, selon les conditions de travail du dossier." : "Règlement par virement à réception de facture.",
        "Pour les quantités non livrées, rapprocher l'avoir ; réceptionner uniquement les quantités du BL."], parties);
    const missing = purchase.lines.filter(l => l.shortage > 0);
    if (missing.length) {
      const credit = missing.reduce((sum, l) => sum + Math.round(l.shortage * l.unitPrice), 0), vat = Math.round(credit * .055);
      add("credit", "Avoir fournisseur", invoiceOn, suffix, [section(`AV-${suffix}`, ["Produit non livré", "Quantité", "HT à déduire"], missing.map(l => {
        const p = ingredientById(l.productId); return [p.name, `${number(l.shortage)} ${p.unit}`, money(-Math.round(l.shortage * l.unitPrice))];
      })), section("Rapprochement", ["HT", "TVA 5,5 %", "TTC"], [[money(-credit), money(-vat), money(-credit - vat)]])],
        [`Avoir rattaché à ${invoice}. Aucune entrée de stock.`], parties);
    }
  }
}
