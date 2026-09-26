import { useEffect, useState } from "react";
import Button from "../common/Button";
import Input from "../common/Input";
import { createMenuIdeas, getMenu, getMenuSurplusOptions, saveMenu, type MenuIdeasResult,
  type MenuRecipeIdea, type MenuSuggestion, type MenuSurplusOptions } from "../../services/menuService";

interface MenuIdeasModalProps { onValidate: () => void; onClose: () => void; }
type MenuField = "starter" | "main" | "dessert";

const fieldForCategory = (category: MenuRecipeIdea["category"]): MenuField =>
  category === "Entrée" ? "starter" : category === "Dessert" ? "dessert" : "main";
const labelForField = (field: MenuField) => field === "starter" ? "l’entrée" : field === "dessert" ? "le dessert" : "le plat";

export default function MenuIdeasModal({ onValidate, onClose }: MenuIdeasModalProps) {
  const [menu, setMenu] = useState<MenuSuggestion | null>(null);
  const [surplus, setSurplus] = useState<MenuSurplusOptions | null>(null);
  const [surplusError, setSurplusError] = useState("");
  const [surplusLoading, setSurplusLoading] = useState(true);
  const [surplusReload, setSurplusReload] = useState(0);
  const [surplusActionVisible, setSurplusActionVisible] = useState(false);
  const [ideas, setIdeas] = useState<MenuIdeasResult | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [surplusQuantity, setSurplusQuantity] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    let active = true;
    void getMenu().then((savedMenu) => {
      if (active) setMenu(savedMenu);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Menu indisponible.");
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    void getMenuSurplusOptions().then((options) => {
      if (active) { setSurplus(options); setSurplusError(""); }
    }).catch((cause: unknown) => {
      if (active) setSurplusError(cause instanceof Error ? cause.message : "Aide au surstock indisponible.");
    }).finally(() => {
      if (active) setSurplusLoading(false);
    });
    return () => { active = false; };
  }, [surplusReload]);

  const selectedOption = surplus?.options.find((option) => option.productId === selectedProductId) ?? null;
  const reloadSurplus = () => {
    if (surplusLoading || (!surplusError && !surplus?.available)) return;
    setSurplusLoading(true);
    setSurplusActionVisible(true);
    setSurplus(null);
    setSelectedProductId("");
    setSurplusQuantity("");
    setIdeas(null);
    setSurplusReload((current) => current + 1);
  };
  const persist = async (validate: boolean) => {
    if (!menu || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      setMenu(await saveMenu(menu, validate)); setDirty(false);
      setNotice(validate ? "Menu validé et décision enregistrée." : "Brouillon enregistré.");
      if (validate) onValidate();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  const generateIdeas = async () => {
    if (!selectedOption || generating) return;
    const quantity = Number(surplusQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > selectedOption.countedQuantity ||
        (selectedOption.unit === "pcs" && !Number.isInteger(quantity))) {
      setError("Indiquez une quantité positive qui ne dépasse pas le comptage affiché.");
      return;
    }
    setGenerating(true); setError(""); setNotice("");
    try {
      setIdeas(await createMenuIdeas({ operationId: crypto.randomUUID(), surplus: [{ productId: selectedOption.productId,
        stockCountId: selectedOption.stockCountId, expectedStockRevision: selectedOption.stockRevision, quantity }] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Idées de menu indisponibles."); }
    finally { setGenerating(false); }
  };

  const applyIdea = (idea: MenuRecipeIdea) => {
    if (!menu || idea.status !== "feasible") return;
    const field = fieldForCategory(idea.category);
    setMenu({ ...menu, [field]: idea.recipeName }); setDirty(true);
    setNotice(`${idea.recipeName} ajouté comme ${labelForField(field)}. Vérifiez et enregistrez le brouillon.`);
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
      <h3>Menu à adapter</h3>
      <p>Le menu reste un brouillon : les idées calculées ne lancent aucune production et ne modifient pas le stock.</p>
      <section aria-labelledby="menu-surplus-title" className="flex flex-col gap-md">
        <h4 id="menu-surplus-title">Idées depuis un surstock compté</h4>
        {surplusLoading ? (
          <p role="status">Chargement des comptages utiles aux idées…</p>
        ) : surplusError ? (
          <p role="alert">{surplusError}</p>
        ) : surplus && !surplus.available ? (
          <p>Cette aide n’est pas disponible dans cet espace.</p>
        ) : surplus?.available ? (
          <>
            <p>Choisissez un comptage encore actuel et indiquez explicitement la quantité à considérer comme surstock. Aucun seuil global n’est utilisé. Chaque idée est évaluée séparément avec cette quantité : les portions ne s’additionnent pas entre recettes. Les dates de péremption ne sont pas renseignées : vérifiez-les avant tout service.</p>
            {surplus.options.length === 0 ? (
              <p>Aucun comptage positif et actuel. Comptez d’abord un produit dans Stocks.</p>
            ) : (
              <>
                <label htmlFor="menu-surplus-product">Produit et comptage</label>
                <select id="menu-surplus-product" className="input-field" value={selectedProductId}
                  disabled={generating}
                  onChange={(event) => { setSelectedProductId(event.target.value); setSurplusQuantity(""); setIdeas(null); }}>
                  <option value="">Choisir un produit compté</option>
                  {surplus.options.map((option) => <option key={option.productId} value={option.productId}>
                    {option.productName} · {option.countedQuantity} {option.unit} comptés le {new Date(option.countedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}
                  </option>)}
                </select>
                {selectedOption && (
                  <>
                    <Input id="menu-surplus-quantity" label={`Quantité à considérer comme surstock (${selectedOption.unit})`}
                      type="number" min={selectedOption.unit === "pcs" ? 1 : 0.001}
                      step={selectedOption.unit === "pcs" ? 1 : 0.001} max={selectedOption.countedQuantity}
                      disabled={generating}
                      value={surplusQuantity} onChange={(event) => { setSurplusQuantity(event.target.value); setIdeas(null); }} />
                    <p>Comptage du {new Date(selectedOption.countedAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} :
                      {" "}{selectedOption.countedQuantity} {selectedOption.unit} maximum.</p>
                    <Button variant="outline" onClick={() => void generateIdeas()} disabled={!surplusQuantity}
                      aria-disabled={generating || !surplusQuantity}>
                      {generating ? "Calcul des idées…" : "Calculer les idées"}
                    </Button>
                  </>
                )}
                {ideas && (
                  <section aria-labelledby="menu-ideas-result-title" className="flex flex-col gap-sm">
                    <h4 id="menu-ideas-result-title">Idées calculées · {ideas.asOfDate}</h4>
                    <p role="status">Aucune recette ni production n’est créée automatiquement. Les portions maximales sont indicatives et fondées sur les comptages actuels.</p>
                    {ideas.emptyReason && <p>{ideas.emptyReason}</p>}
                    {ideas.ideas.map((idea) => <article key={`${idea.recipeId}-${idea.version}`}>
                      <h5>{idea.recipeName} · {idea.category} · v{idea.version} (depuis le {new Date(`${idea.effectiveFrom}T00:00:00.000Z`).toLocaleDateString("fr-FR", { timeZone: "UTC" })})</h5>
                      <p>{idea.status === "feasible" ? `Faisable jusqu’à ${idea.maximumPortions} portion(s) selon les comptages actuels.` : "Pas réalisable selon les quantités actuellement vérifiées."}</p>
                      {idea.surplusProducts.map((product) => <p key={product.productId}>
                        Surstock désigné : {product.quantity} {product.unit} de {product.productName}.
                      </p>)}
                      {idea.blockers.length > 0 && <ul>{idea.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
                      <p>Péremption : inconnue. Vérifiez la date avant d’utiliser les produits.</p>
                      <Button variant="outline" disabled={idea.status !== "feasible" || saving}
                        onClick={() => applyIdea(idea)}>
                        Utiliser comme {labelForField(fieldForCategory(idea.category))}
                      </Button>
                    </article>)}
                  </section>
                )}
              </>
            )}
          </>
        ) : null}
        {(surplusError || surplus?.available || surplusActionVisible) && <Button
          key="surplus-refresh"
          variant="outline"
          onClick={reloadSurplus}
          aria-disabled={surplusLoading || (surplus !== null && !surplus.available)}>
          {surplusLoading ? "Actualisation des comptages…" : surplusError ? "Réessayer les idées de menu" : surplus?.available ? "Actualiser les comptages" : "Aide au surstock indisponible"}
        </Button>}
      </section>
      <p>Le menu affiché reste modifiable avant validation. La validation n’enregistre aucune production.</p>
      {([['starter', 'Entrée'], ['main', 'Plat'], ['dessert', 'Dessert']] as const).map(([field, label]) => <Input key={field} id={`menu-${field}`} label={label} value={menu[field]} disabled={saving} onChange={(event) => { setMenu({ ...menu, [field]: event.target.value }); setDirty(true); }} />)}
      <p>{menu.status === "validated" && !dirty ? `Validé le ${new Date(menu.validatedAt!).toLocaleString("fr-FR")}` : "Brouillon non validé"}</p>
      <div className="flex gap-sm">
        <Button variant="outline" onClick={() => void persist(false)} aria-disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
        </Button>
        <Button onClick={() => void persist(true)} aria-disabled={saving}>{saving ? "Enregistrement…" : "Valider le menu"}</Button>
        <Button variant="outline" onClick={print} disabled={dirty || menu.status !== "validated" || saving}>Imprimer</Button>
      </div>
    </>}
    <Button variant="outline" onClick={onClose} disabled={saving || generating}>Fermer</Button>
  </div>;
}
