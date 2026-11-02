import { useState } from "react";
import type { Recipe } from "../../types";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import Button from "../common/Button";
import { filterRecipeSheets, type RecipeSheetStatus } from "../../features/recipes/recipeSheetFilter";

export default function RecipeSheets({ recipes, loading, costPerPortion, onEdit, editing = false }: {
  recipes: Recipe[];
  loading: boolean;
  editing?: boolean;
  costPerPortion: (recipe: Recipe) => number | null;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RecipeSheetStatus>("all");
  const query = search.trim().toLocaleLowerCase("fr");
  const visible = filterRecipeSheets(recipes, search, status);
  return <section className="recipe-sheets" aria-labelledby="recipe-sheets-title">
    <h2 id="recipe-sheets-title">Fiches techniques</h2>
    <p>Le coût matière est estimé à partir des prix actuels enregistrés pour les ingrédients.</p>
    <div className="recipe-sheets-filters"><label className="recipe-sheets-search">Rechercher une fiche<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom de la recette" /></label>
      <label className="recipe-sheets-search">État des ingrédients<select value={status} onChange={(event) => setStatus(event.target.value as RecipeSheetStatus)}><option value="all">Tous les états</option><option value="complete">Ingrédients renseignés</option><option value="incomplete">À compléter</option></select></label></div>
    {loading ? <p role="status">Chargement des fiches…</p> : visible.length === 0 ? <p role="status">{query || status !== "all" ? "Aucune fiche ne correspond à ces filtres." : "Aucune fiche enregistrée."}</p> : <>
      <p id="recipe-sheets-scroll-hint" className="recipe-sheets-hint">Sur petit écran, faites défiler le tableau horizontalement ; au clavier, utilisez les flèches.</p>
      <div className="recipe-sheets-table-wrap" role="region" aria-label="Fiches techniques" aria-describedby="recipe-sheets-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="recipe-sheets-table"><thead><tr><th scope="col">Fiche technique</th><th scope="col">Portions par lot</th><th scope="col">Coût estimé par portion</th><th scope="col">État</th><th scope="col">Action</th></tr></thead>
          <tbody>{visible.map((recipe) => {
            const cost = costPerPortion(recipe);
            return <tr key={recipe.id}><th scope="row">{recipe.name}<small>Version {recipe.version} · {recipe.category}</small></th>
              <td>{recipe.yieldPortions}</td><td>{cost === null ? "Indisponible" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cost)}</td>
              <td>{recipe.ingredients.length ? "Ingrédients renseignés" : "À compléter"}</td>
              <td><Button size="sm" variant="outline" aria-label={`Modifier la fiche ${recipe.name}`} disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier</Button></td></tr>;
          })}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
