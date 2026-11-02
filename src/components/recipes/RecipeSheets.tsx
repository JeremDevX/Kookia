import { useState } from "react";
import type { Recipe } from "../../types";
import { scrollScrollableRegionWithArrowKeys } from "../../utils/scrollableRegion";
import Button from "../common/Button";

export default function RecipeSheets({ recipes, loading, costPerPortion, onEdit }: {
  recipes: Recipe[];
  loading: boolean;
  costPerPortion: (recipe: Recipe) => number | null;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("fr");
  const visible = recipes.filter((recipe) => recipe.name.toLocaleLowerCase("fr").includes(query));
  return <section className="recipe-sheets" aria-labelledby="recipe-sheets-title">
    <h2 id="recipe-sheets-title">Fiches techniques</h2>
    <p>Le coût matière est estimé à partir des prix actuels enregistrés pour les ingrédients.</p>
    <label className="recipe-sheets-search">Rechercher une fiche<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom de la recette" /></label>
    {loading ? <p role="status">Chargement des fiches…</p> : visible.length === 0 ? <p role="status">{query ? "Aucune fiche ne correspond à cette recherche." : "Aucune fiche enregistrée."}</p> : <>
      <p id="recipe-sheets-scroll-hint" className="recipe-sheets-hint">Sur petit écran, faites défiler le tableau horizontalement ; au clavier, utilisez les flèches.</p>
      <div className="recipe-sheets-table-wrap" role="region" aria-label="Fiches techniques" aria-describedby="recipe-sheets-scroll-hint" tabIndex={0} onKeyDown={scrollScrollableRegionWithArrowKeys}>
        <table className="recipe-sheets-table"><thead><tr><th scope="col">Fiche technique</th><th scope="col">Portions par lot</th><th scope="col">Coût estimé par portion</th><th scope="col">État</th><th scope="col">Action</th></tr></thead>
          <tbody>{visible.map((recipe) => {
            const cost = costPerPortion(recipe);
            return <tr key={recipe.id}><th scope="row">{recipe.name}<small>Version {recipe.version} · {recipe.category}</small></th>
              <td>{recipe.yieldPortions}</td><td>{cost === null ? "Indisponible" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cost)}</td>
              <td>{recipe.ingredients.length ? "Ingrédients renseignés" : "À compléter"}</td>
              <td><Button size="sm" variant="outline" aria-label={`Modifier la fiche ${recipe.name}`} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier</Button></td></tr>;
          })}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
