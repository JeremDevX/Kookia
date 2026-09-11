import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { getMenu, saveMenu, type MenuSuggestion } from "../../services/menuService";
interface MenuIdeasModalProps { onValidate: () => void; onClose: () => void; }
export default function MenuIdeasModal({ onValidate, onClose }: MenuIdeasModalProps) {
  const [menu, setMenu] = useState<MenuSuggestion | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    let active = true;
    getMenu().then((data) => { if (active) setMenu(data); }, (error: unknown) => { if (active) setError(error instanceof Error ? error.message : "Menu indisponible."); });
    return () => { active = false; };
  }, []);
  const persist = async (validate: boolean) => {
    if (!menu || saving) return;
    setSaving(true); setError(""); setNotice("");
    try { setMenu(await saveMenu(menu, validate)); setDirty(false); setNotice(validate ? "Menu validé et décision enregistrée." : "Brouillon enregistré."); if (validate) onValidate(); }
    catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };
  const print = () => {
    if (!menu) return;
    const page = window.open("", "_blank");
    if (!page) { setError("Autorisez l’ouverture de la fenêtre d’impression puis réessayez."); return; }
    page.document.title = "Menu";
    const heading = page.document.createElement("h1"); heading.textContent = "Menu"; page.document.body.append(heading);
    for (const [label, value] of [["Entrée", menu.starter], ["Plat", menu.main], ["Dessert", menu.dessert]]) {
      const title = page.document.createElement("h2"); title.textContent = label;
      const text = page.document.createElement("p"); text.textContent = value; page.document.body.append(title, text);
    }
    page.document.close(); page.focus(); page.print();
  };
  return <div className="flex flex-col gap-lg">
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {!menu ? !error && <p role="status">Chargement du menu…</p> : <>
      <h3>Suggestion de menu à revoir</h3>
      <p>Exemple de démonstration : les estimations de valorisation ne sont pas recalculées à partir du stock actuel.</p>
      <details><summary>Hypothèses de la suggestion initiale</summary><p>{menu.stockOptimizationText} Estimation initiale : {menu.reclaimedStockKg} kg sur {menu.criticalWindowHours} h, non vérifiée.</p></details>
      {([['starter', 'Entrée'], ['main', 'Plat'], ['dessert', 'Dessert']] as const).map(([field, label]) => <Input key={field} id={`menu-${field}`} label={label} value={menu[field]} disabled={saving} onChange={(event) => { setMenu({ ...menu, [field]: event.target.value }); setDirty(true); }} />)}
      <p>{menu.status === "validated" && !dirty ? `Validé le ${new Date(menu.validatedAt!).toLocaleString("fr-FR")}` : "Brouillon à valider"}. Aucune production n’est lancée par cette action.</p>
      <div className="flex gap-sm">
        <Button variant="outline" onClick={() => void persist(false)} disabled={saving}>Enregistrer le brouillon</Button>
        <Button onClick={() => void persist(true)} disabled={saving}>{saving ? "Enregistrement…" : "Valider le menu"}</Button>
        <Button variant="outline" onClick={print} disabled={dirty || menu.status !== "validated" || saving}>Imprimer</Button>
      </div>
    </>}
    <Button variant="outline" onClick={onClose} disabled={saving}>Fermer</Button>
  </div>;
}
