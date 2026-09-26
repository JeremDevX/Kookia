import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import { getRecipes } from "../../services/recipeService";
import { getServiceSheet, saveServiceSheet } from "../../services/serviceSheetService";
import { downloadServiceSheetPrint } from "../../features/services/serviceSheetPrint";
import { forecastSheetPlan } from "../../features/services/serviceSheetForecast";
import { getOperationalForecast } from "../../services/serviceOperationsService";
import type { Recipe } from "../../types";
import type { ServiceSlot } from "../../../shared/serviceCalendar";
import type { SheetInput } from "../../../shared/serviceOperations";
import type { ServiceSheet } from "../../../shared/serviceSheet";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";

export default function ServiceSheetPanel({ date, slot, onChanged }: { date: string; slot: ServiceSlot; onChanged?: () => void }) {
  const [sheet, setSheet] = useState<ServiceSheet | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [planned, setPlanned] = useState<SheetInput["planned"]>([]);
  const [outcomes, setOutcomes] = useState<SheetInput["outcomes"]>([]);
  const [substitutions, setSubstitutions] = useState<SheetInput["substitutions"]>([]);
  const [note, setNote] = useState("");
  const [recipeId, setRecipeId] = useState("");
  const [portions, setPortions] = useState(0);
  const [fromRecipeId, setFromRecipeId] = useState("");
  const [toRecipeId, setToRecipeId] = useState("");
  const [replacementPortions, setReplacementPortions] = useState(1);
  const [replacementNote, setReplacementNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [forecastKey, setForecastKey] = useState<string | null>(null);
  const loadRevision = useRef(0);
  const apply = (result: ServiceSheet) => {
    setSheet(result); setPlanned(result.planned); setOutcomes(result.outcomes); setSubstitutions(result.substitutions); setNote(result.note);
    setForecastKey(result.forecastKey);
  };
  const load = useCallback(async () => {
    const requestRevision = ++loadRevision.current;
    setBusy(true); setError(""); setStatus("");
    try {
      const [result, catalog] = await Promise.all([getServiceSheet(date, slot), getRecipes()]);
      if (loadRevision.current !== requestRevision) return;
      apply(result); setRecipes(catalog); setOperationId(crypto.randomUUID());
    } catch (cause) { if (loadRevision.current === requestRevision) setError(cause instanceof Error ? cause.message : "Fiche indisponible."); }
    finally { if (loadRevision.current === requestRevision) setBusy(false); }
  }, [date, slot]);
  useEffect(() => {
    void load(); const revision = loadRevision;
    return () => { revision.current++; };
  }, [load]);
  const changed = () => { setOperationId(crypto.randomUUID()); setStatus(""); };
  const importForecast = async () => {
    if (!sheet) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const forecast = await getOperationalForecast(date, date);
      const service = forecast.services.find(entry => entry.slot === slot);
      const suggestion = service && service.menuRevision === sheet.menuRevision && service.blockers.length === 0
        ? forecastSheetPlan(sheet.menuEntries, service.items) : null;
      if (!suggestion) { setError(service?.blockers.join(" ") || "La prévision ou la carte ne permet pas de proposer un plan complet."); return; }
      if (!planned.length) setPlanned(suggestion);
      setForecastKey(service!.forecastKey); setNote(current => `${current}${current ? "\n" : ""}Référence d’estimations du ${date}, observations arrêtées au ${forecast.asOfDate}. Portions arrondies au supérieur, à revoir par le chef.`.slice(0, 2000));
      changed(); setStatus(planned.length ? "Référence actualisée ; les quantités du chef sont conservées. Revoyez-les avant validation." : "Estimations reprises dans le brouillon uniquement. Revoyez les quantités avant validation.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prévision indisponible."); }
    finally { setBusy(false); }
  };
  const save = async (action: SheetInput["action"]) => {
    if (!sheet) return;
    setBusy(true); setError(""); setStatus("");
    try {
      const result = await saveServiceSheet({ serviceDate: date, slot, action, operationId,
        expectedRevision: sheet.revision, planned, outcomes, substitutions, note, ...(forecastKey ? { forecastKey } : {}) });
      apply(result); setOperationId(crypto.randomUUID()); onChanged?.();
      setStatus(action === "close" ? "Service clôturé ; le constat est conservé sans nouvelle sortie de stock." : action === "validate_plan" ? "Plan validé par le chef. Enregistrez séparément les préparations réellement réalisées." : "Brouillon enregistré.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  const addPlan = (event: FormEvent) => {
    event.preventDefault(); if (!recipeId) return;
    setPlanned(current => [...current.filter(row => row.recipeId !== recipeId), { recipeId, portions }]); changed();
  };
  const outcome = (id: string, field: "retained" | "discarded" | "note", value: number | string) => {
    setOutcomes(current => {
      const previous = current.find(row => row.recipeId === id) ?? { recipeId: id, retained: 0, discarded: 0, note: "" };
      return [...current.filter(row => row.recipeId !== id), { ...previous, [field]: value }];
    }); changed();
  };
  const addSubstitution = (event: FormEvent) => {
    event.preventDefault(); setSubstitutions(current => [...current, { fromRecipeId, toRecipeId, portions: replacementPortions, note: replacementNote }]);
    setReplacementNote(""); changed();
  };
  const closed = sheet?.state === "closed", validated = sheet?.state === "validated" || closed;
  const recipeName = (id: string) => recipes.find(recipe => recipe.id === id)?.name ?? sheet?.facts.lines.find(line => line.recipeId === id)?.recipeName ?? "Recette inconnue";
  return <section className="sales-panel" aria-labelledby="service-sheet-title">
    <h2 id="service-sheet-title">Fiche de service</h2>
    <p>Prévu → plan validé par le chef → préparations et compléments enregistrés → ventes → invendus conservés ou écartés. Le plan ne déduit pas de stock.</p>
    {busy && <p role="status">Chargement / enregistrement…</p>}
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>Recharger le constat enregistré</Button>
    {sheet && <>
      <p>État : {closed ? "clôturé" : validated ? "plan validé" : "brouillon"} · révision {sheet.revision}. Carte de référence : {sheet.menuRevision || "non renseignée"}.</p>
      <div className="sales-actions"><Link to="/recipes">Enregistrer une production ou un complément</Link><Link to="/sales">Ventiler et revoir les ventes</Link><Link to="/stocks">Déclarer les pertes liées aux préparations</Link></div>
      <h3>Préparation prévue</h3>
      <p>Provenance du plan : {forecastKey ? validated ? "estimations reprises, puis revues par le chef" : "estimations reprises, à revoir par le chef" : "quantités saisies manuellement"}.</p>
      {!validated && (!planned.length || forecastKey) && <Button type="button" variant="outline" disabled={busy} onClick={() => void importForecast()}>{planned.length ? "Actualiser la référence de prévision, conserver le plan" : "Reprendre les estimations dans le brouillon"}</Button>}
      {!validated && forecastKey && <Button type="button" variant="outline" disabled={busy} onClick={() => { setForecastKey(null); changed(); }}>Conserver les quantités comme plan manuel</Button>}
      {!validated && <form className="sales-form" onSubmit={addPlan}>
        <label>Recette<select required value={recipeId} onChange={(event) => setRecipeId(event.target.value)}><option value="">Choisir une recette</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label>
        <label>Portions prévues<input type="number" required min="0" max="10000" step="1" value={portions} onChange={(event) => setPortions(Number(event.target.value))} /></label>
        <Button type="submit" disabled={busy}>Ajouter / actualiser au plan</Button>
      </form>}
      <ul>{planned.map(row => <li key={row.recipeId}>{recipeName(row.recipeId)} : {row.portions} portions {!validated && <button type="button" onClick={() => { setPlanned(current => current.filter(entry => entry.recipeId !== row.recipeId)); changed(); }}>Retirer {recipeName(row.recipeId)}</button>}</li>)}</ul>
      {!planned.length && <p>Aucune quantité prévue enregistrée. Les prévisions restent des suggestions à revoir.</p>}
      <h3>Substitutions et écarts</h3>
      {!closed && <form className="sales-form" onSubmit={addSubstitution}>
        <label>Recette remplacée<select required value={fromRecipeId} onChange={(event) => setFromRecipeId(event.target.value)}><option value="">Choisir</option>{planned.map(row => <option key={row.recipeId} value={row.recipeId}>{recipeName(row.recipeId)}</option>)}</select></label>
        <label>Recette retenue<select required value={toRecipeId} onChange={(event) => setToRecipeId(event.target.value)}><option value="">Choisir</option>{recipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label>
        <label>Portions remplacées<input type="number" required min="1" max="10000" step="1" value={replacementPortions} onChange={(event) => setReplacementPortions(Number(event.target.value))} /></label>
        <label>Explication<input required maxLength={500} value={replacementNote} onChange={(event) => setReplacementNote(event.target.value)} /></label>
        <Button type="submit" disabled={busy || fromRecipeId === toRecipeId}>Ajouter la substitution</Button>
      </form>}
      <ul>{substitutions.map((row, index) => <li key={index}>{recipeName(row.fromRecipeId)} → {recipeName(row.toRecipeId)} : {row.portions} portions. {row.note} {!closed && <button type="button" onClick={() => { setSubstitutions(current => current.filter((_, itemIndex) => itemIndex !== index)); changed(); }}>Retirer la substitution {index + 1}</button>}</li>)}</ul>
      <h3>Rapprochement courant</h3>
      <p>« Inconnu » signifie que la couverture ou l’attribution est incomplète. Les invendus ne sont pas automatiquement du gaspillage. Les pertes de préparation en kg/L restent distinctes des portions ; les retours d’assiette sont déjà compris dans les ventes.</p>
      {sheet.facts.gaps.length > 0 && <ul>{sheet.facts.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul>}
      <ul>{sheet.facts.lines.filter(line => line.refused > 0).map(line => <li key={line.recipeId}>{line.recipeName} : {line.refused} demandes non servies, distinctes des ventes et des pertes.</li>)}</ul>
      {sheet.facts.unallocatedRefusals > 0 && <p>{sheet.facts.unallocatedRefusals} demandes non servies de la journée restent non ventilées ; aucune attribution n’est supposée.</p>}
      <details><summary>Remboursements monétaires signalés dans la journée ({sheet.facts.dailyRefunds.length})</summary>
        <p>Service non ventilé : aucune attribution à midi ou soir n’est supposée. Montant non renseigné ; les quantités servies et le stock restent inchangés. <Link to="/sales">Consulter la provenance des ventes</Link>.</p>
        <ul>{sheet.facts.dailyRefunds.map(refund => <li key={refund.id}>{refund.saleItemName} · {refund.serviceDate} · {new Date(refund.recordedAt).toLocaleString("fr-FR")} · référence {refund.id}{refund.saleId && ` · vente ${refund.saleId}`}. {refund.reason}</li>)}</ul>
      </details>
      <p id="service-sheet-scroll-hint">Sur petit écran, faites défiler le tableau horizontalement ; au clavier, utilisez les flèches après avoir placé le focus sur la zone du tableau.</p>
      <div className="sales-table-wrap" role="region" aria-label="Rapprochement du service" aria-describedby="service-sheet-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}><table className="sales-table"><thead><tr><th scope="col">Recette</th><th scope="col">Prévu / ajusté</th><th scope="col">Préparé / complément</th><th scope="col">Vendu</th><th scope="col">Invendu</th><th scope="col">Conservé</th><th scope="col">Écarté</th><th scope="col">Explication</th></tr></thead>
        <tbody>{sheet.facts.lines.map(line => {
          const row = outcomes.find(entry => entry.recipeId === line.recipeId);
          return <tr key={line.recipeId}><th scope="row">{line.recipeName}</th><td>{line.planned} / {line.adjustedPlanned}</td><td>{line.prepared} / +{line.additionalPrepared}</td>
            <td>{line.sold === null ? `Inconnu (${line.soldObserved} observées)` : line.sold}</td><td>{line.unsold ?? "Inconnu"}</td>
            <td><label>Conservé<input aria-label={`Portions conservées de ${line.recipeName}`} type="number" disabled={closed || busy} min="0" max="10000" step="0.001" value={row?.retained ?? 0} onChange={(event) => outcome(line.recipeId, "retained", Number(event.target.value))} /></label></td>
            <td><label>Écarté<input aria-label={`Portions écartées de ${line.recipeName}`} type="number" disabled={closed || busy} min="0" max="10000" step="0.001" value={row?.discarded ?? 0} onChange={(event) => outcome(line.recipeId, "discarded", Number(event.target.value))} /></label><small>{line.recordedUnsoldWaste} pertes d’invendus déclarées</small></td>
            <td><ul>{line.explanation.map(explanation => <li key={explanation}>{explanation}</li>)}</ul><label>Explication<input aria-label={`Explication pour ${line.recipeName}`} disabled={closed || busy} maxLength={500} value={row?.note ?? ""} onChange={(event) => outcome(line.recipeId, "note", event.target.value)} /></label></td></tr>;
        })}</tbody></table></div>
      <label>Contexte global, sans donnée personnelle<textarea disabled={closed || busy} maxLength={2000} value={note} onChange={(event) => { setNote(event.target.value); changed(); }} /></label>
      {sheet.factsChangedSinceClosure && <p role="status">Des opérations ont changé depuis la clôture. Le constat de clôture reste conservé dans la fiche imprimable ; le tableau présente le rapprochement courant.</p>}
      <div className="sales-actions">
        {!closed && <Button disabled={busy} type="button" onClick={() => void save("save")}>Enregistrer le brouillon / rapprochement</Button>}
        {!validated && <Button disabled={busy || !planned.length} type="button" onClick={() => void save("validate_plan")}>Chef : valider le plan de préparation</Button>}
        {validated && !closed && <Button disabled={busy || sheet.facts.gaps.length > 0} type="button" onClick={() => void save("close")}>Chef : confirmer la clôture et les invendus</Button>}
        <Button disabled={busy} type="button" variant="outline" onClick={() => downloadServiceSheetPrint(sheet)}>Télécharger la fiche imprimable</Button>
      </div>
      <small>La clôture rapproche les pertes d’invendus déjà déclarées ; elle ne crée ni vente ni production ni seconde déduction de matière. Rechargez après une nouvelle opération.</small>
    </>}
  </section>;
}
