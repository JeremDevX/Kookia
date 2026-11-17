import Button from "../common/Button";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import { parseCount, type InventoryDraft } from "../../features/inventory/inventoryDraft";

export default function InventoryCountTable({ draft, search, category, busy, countDisabled, edit }: {
  draft: InventoryDraft; search: string; category: string; busy: boolean; countDisabled: boolean;
  edit: (apply: (current: InventoryDraft) => InventoryDraft) => void;
}) {
  const { session, values, conflicts, prior } = draft;
  const query = search.toLocaleLowerCase("fr");
  const visible = session.lines.filter((line) => line.name.toLocaleLowerCase("fr").includes(query) &&
    (category === "all" || line.category === category));
  const setReason = (current: InventoryDraft, id: string, reason: string) => ({
    ...current.session, lines: current.session.lines.map((line) => line.productId === id ? { ...line, reason } : line),
  });
  const resolveConflict = (id: string, useSaved: boolean) => edit((current) => {
    const next = { ...current.conflicts };
    const conflict = next[id];
    if (!conflict) return current;
    delete next[id];
    return useSaved ? { ...current, conflicts: next, values: { ...current.values, [id]: conflict.quantity?.toString() ?? "" },
      session: setReason(current, id, conflict.reason) } : { ...current, conflicts: next };
  });

  return <div className="stocks-table-card stock-count-list" role="region" aria-label="Inventaire des produits — défilement horizontal avec les flèches" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
    <table className="stocks-table">
      <thead><tr><th scope="col">Produit</th><th scope="col">Unité</th><th scope="col">Stock théorique</th><th scope="col">Quantité comptée</th><th scope="col">Écart et justification</th></tr></thead>
      <tbody>{visible.map((line) => {
        const id = line.productId;
        const value = values[id] ?? "";
        const quantity = parseCount(value);
        const delta = quantity === null || !Number.isFinite(quantity) ? null : Math.round((quantity - line.theoreticalQuantity) * 1000) / 1000;
        const conflict = conflicts[id];
        const priorCount = prior[id];
        return <tr key={id}>
          <th scope="row">{line.name}
            {line.available === false && <small className="stock-cell-note">Produit indisponible</small>}
            {line.previousCount && <small className="stock-cell-note">Ancien comptage à vérifier : {line.previousCount.quantity} {line.previousCount.unit}{line.previousCount.reason && ` · ${line.previousCount.reason}`}</small>}
            {priorCount && <small className="stock-cell-note">Votre saisie précédente : {priorCount.value} {priorCount.unit}{priorCount.reason && ` · ${priorCount.reason}`}</small>}
            {conflict && <div className="stock-cell-note">Valeur enregistrée : {conflict.quantity === null ? "non compté" : `${conflict.quantity} ${line.unit}`} {conflict.reason && `· ${conflict.reason}`}
              <Button variant="outline" size="sm" disabled={busy} onClick={() => resolveConflict(id, false)}>Garder ma saisie</Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => resolveConflict(id, true)}>Prendre la valeur enregistrée</Button>
            </div>}
          </th>
          <td><span className="inventory-mobile-label">Unité</span>{line.unit}</td>
          <td><span className="inventory-mobile-label">Stock théorique</span>{line.theoreticalQuantity.toLocaleString("fr-FR")} {line.unit}</td>
          <td><span className="inventory-mobile-label">Quantité comptée</span><input type="number" min="0" max="1000000" step="0.001"
            aria-label={`Quantité comptée : ${line.name}`} value={value} disabled={countDisabled || line.available === false}
            onChange={(event) => {
              const quantity = event.target.value;
              edit((current) => ({ ...current, values: { ...current.values, [id]: quantity } }));
            }} /></td>
          <td><span className="inventory-mobile-label">Écart et justification</span>{delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toLocaleString("fr-FR")} ${line.unit}`}
            {delta !== null && delta !== 0 && <input aria-label={`Justification de l’écart : ${line.name}`}
              placeholder="Cause de l’écart" maxLength={1000} value={line.reason} disabled={countDisabled}
              onChange={(event) => {
                const reason = event.target.value;
                edit((current) => ({ ...current, session: setReason(current, id, reason) }));
              }} />}
          </td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}
