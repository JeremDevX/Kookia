import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import { menuInputSchema, type MenuEntryInput, type ServiceMenu } from "../../../shared/serviceOperations";
import type { Recipe } from "../../types";
import { getRecipes } from "../../services/recipeService";
import { getSaleItems, type SaleItem } from "../../services/salesService";
import { getMenuHistory, getServiceMenu, saveServiceMenu } from "../../services/serviceOperationsService";
import Button from "../common/Button";
import ServiceMenuEntryEditor from "./ServiceMenuEntryEditor";
import { menuDraft, newMenuEntry } from "./serviceMenuDraft";
import "./ServiceOperations.css";
export function ServiceMenuHistory({ history }: { history: ServiceMenu[] }) {
  return <details><summary>Historique des cartes ({history.length})</summary>
    {!history.length && <p>Aucune version enregistrée.</p>}
    <ol>{history.map((menu) => <li key={menu.id ?? menu.revision}>
      <strong>Version {menu.revision}</strong> · {menu.createdAt ? new Date(menu.createdAt).toLocaleString("fr-FR") : "date inconnue"}
      <ul>{menu.entries.map((entry) => <li key={entry.id}>{entry.name} · {entry.category} · {(entry.priceCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} · {entry.available ? "disponible" : "indisponible"}
        <ul>{entry.components.map((part) => <li key={part.recipeId}>{part.recipeName} · {part.portions} portions · recette version {part.recipeVersion}</li>)}</ul>
      </li>)}</ul>{menu.note && <p>{menu.note}</p>}
    </li>)}</ol>
  </details>;
}
export default function ServiceMenuEditor({ date, slot, onChanged }: { date: string; slot: ServiceSlot; onChanged?: () => void }) {
  const [menu, setMenu] = useState<ServiceMenu | null>(null);
  const [history, setHistory] = useState<ServiceMenu[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [entries, setEntries] = useState<MenuEntryInput[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    setLoading(true); setMenu(null); setError(""); setMessage(""); setSaving(false);
    void Promise.all([getServiceMenu(date, slot), getMenuHistory(date, slot), getRecipes(), getSaleItems()])
      .then(([current, versions, recipeRows, saleRows]) => {
        if (generation.current !== request) return;
        setMenu(current); setHistory(versions); setRecipes(recipeRows); setSales(saleRows);
        setEntries(menuDraft(current)); setNote(current.note); setOperationId(crypto.randomUUID());
      }).catch((cause: unknown) => { if (generation.current === request) setError(cause instanceof Error ? cause.message : "Carte indisponible."); })
      .finally(() => { if (generation.current === request) setLoading(false); });
    return () => { generation.current = request + 1; };
  }, [date, slot, reload]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!menu || menu.serviceDate !== date || menu.slot !== slot || saving) return;
    const parsed = menuInputSchema.safeParse({ operationId, expectedRevision: menu.revision, serviceDate: date, slot, entries, note });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Vérifiez la carte."); return; }
    const request = generation.current;
    setSaving(true); setError(""); setMessage("");
    try {
      const saved = await saveServiceMenu(parsed.data);
      if (generation.current !== request) return;
      setMenu(saved); setEntries(menuDraft(saved)); setHistory((current) => [saved, ...current.filter((row) => row.id !== saved.id)]);
      setOperationId(crypto.randomUUID()); setMessage("Carte validée et enregistrée. Stock inchangé."); onChanged?.();
    } catch (cause) { if (generation.current === request) setError(cause instanceof Error ? cause.message : "Carte non enregistrée."); }
    finally { if (generation.current === request) setSaving(false); }
  };
  return <section className="service-operation-panel" aria-labelledby="service-menu-title">
    <h2 id="service-menu-title">Carte du {date} · {slot === "lunch" ? "midi" : "soir"}</h2>
    <p>Plusieurs choix, prix et disponibilités sont enregistrés pour ce service. Les versions de recettes applicables à la date seront conservées.</p>
    <p>Pour une formule, saisir les ventes de la formule OU celles de ses composants, jamais les deux. Enregistrer la carte ne déduit aucune matière.</p>
    {loading && <p role="status">Chargement de la carte…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && <Button type="button" variant="outline" disabled={saving} onClick={() => setReload((value) => value + 1)}>Recharger / annuler les modifications</Button>}
    {!loading && menu && menu.serviceDate === date && menu.slot === slot && <form onSubmit={(event) => void save(event)}>
      <p>Version actuelle : {menu.revision}. Une modification concurrente sera refusée ; rechargez pour la consulter.</p>
      {entries.length === 0 && <p>Aucun article dans la carte. Ajoutez vos choix ; aucune recette n’est sélectionnée automatiquement.</p>}
      {entries.map((entry, index) => <ServiceMenuEntryEditor key={entry.id} entry={entry} index={index} recipes={recipes} sales={sales} disabled={saving}
        onChange={(next) => { setMessage(""); setEntries((current) => current.map((row) => row.id === next.id ? next : row)); }}
        onRemove={() => { setMessage(""); setEntries((current) => current.filter((row) => row.id !== entry.id)); }} />)}
      <Button type="button" variant="outline" disabled={saving || entries.length >= 60} onClick={() => { setMessage(""); setEntries((current) => [...current, newMenuEntry()]); }}>Ajouter un choix</Button>
      <label>Notes de la carte<textarea maxLength={2000} value={note} disabled={saving} onChange={(event) => { setMessage(""); setNote(event.target.value); }} /></label>
      <Button type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Valider et enregistrer la carte"}</Button>
    </form>}
    {message && <p role="status">{message}</p>}
    {!loading && menu && menu.serviceDate === date && menu.slot === slot && <ServiceMenuHistory history={history} />}
  </section>;
}
