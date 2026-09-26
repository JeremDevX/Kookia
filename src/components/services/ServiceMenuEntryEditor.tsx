import type { MenuEntryInput } from "../../../shared/serviceOperations";
import type { Recipe } from "../../types";
import type { SaleItem } from "../../services/salesService";
import Button from "../common/Button";
import { menuCategoryLabels } from "./serviceMenuDraft";
export default function ServiceMenuEntryEditor({ entry, index, recipes, sales, disabled, onChange, onRemove }: {
  entry: MenuEntryInput; index: number; recipes: Recipe[]; sales: SaleItem[]; disabled: boolean;
  onChange: (entry: MenuEntryInput) => void; onRemove: () => void;
}) {
  const component = (row: number, update: Partial<MenuEntryInput["components"][number]>) => onChange({ ...entry,
    components: entry.components.map((value, position) => position === row ? { ...value, ...update } : value) });
  return <fieldset disabled={disabled} className="service-menu-entry">
    <legend>Article {index + 1}{entry.name ? ` : ${entry.name}` : ""}</legend>
    <div className="service-operation-fields">
      <label>Nom<input required maxLength={120} value={entry.name} onChange={(event) => onChange({ ...entry, name: event.target.value })} /></label>
      <label>Catégorie<select value={entry.category} onChange={(event) => onChange({ ...entry,
        category: event.target.value as MenuEntryInput["category"], components: event.target.value === "Formule" ? entry.components : entry.components.slice(0, 1) })}>
        {menuCategoryLabels.map((category) => <option key={category}>{category}</option>)}
      </select></label>
      <label>Article de vente (facultatif)<select value={entry.saleItemId ?? ""} onChange={(event) => onChange({ ...entry, saleItemId: event.target.value || null })}>
        <option value="">Sans correspondance</option>{sales.map((sale) => <option key={sale.id} value={sale.id}>{sale.name}</option>)}
      </select></label>
      <label>Prix historique (centimes)<input type="number" required min="0" max="1000000" step="1" value={Number.isFinite(entry.priceCents) ? entry.priceCents : ""} onChange={(event) => onChange({ ...entry, priceCents: event.target.value === "" ? Number.NaN : Number(event.target.value) })} /></label>
      <label><input type="checkbox" checked={entry.available} onChange={(event) => onChange({ ...entry, available: event.target.checked })} />Disponible pour ce service</label>
    </div>
    <h4>{entry.category === "Formule" ? "Composition de la formule" : "Recette consommée"}</h4>
    {entry.components.map((value, row) => <div className="service-operation-fields" key={row}>
      <label>Recette {row + 1}<select required value={value.recipeId} onChange={(event) => component(row, { recipeId: event.target.value })}>
        <option value="">Choisir une recette</option>{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}
          disabled={entry.components.some((other, position) => position !== row && other.recipeId === recipe.id)}>{recipe.name} ({recipe.category})</option>)}
      </select></label>
      <label>Portions par article vendu<input type="number" required min="0.001" max="100" step="0.001" value={value.portions} onChange={(event) => component(row, { portions: Number(event.target.value) })} /></label>
      {entry.category === "Formule" && entry.components.length > 1 && <Button type="button" variant="outline" onClick={() => onChange({ ...entry,
        components: entry.components.filter((_, position) => position !== row) })}>Retirer la recette {row + 1}</Button>}
    </div>)}
    {entry.category === "Formule" && <Button type="button" variant="outline" disabled={entry.components.length >= 20} onClick={() => onChange({ ...entry,
      components: [...entry.components, { recipeId: "", portions: 1 }] })}>Ajouter une recette à la formule</Button>}
    <Button type="button" variant="outline" onClick={onRemove}>Retirer l’article {index + 1}</Button>
  </fieldset>;
}
