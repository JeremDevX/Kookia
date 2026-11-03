import { useState } from "react";
import { Clock } from "lucide-react";
import type { Recipe } from "../../types";
import Button from "../common/Button";
import RecipeDetail from "./RecipeDetail";
import { sortRecipes, type RecipeSort } from "../../features/recipes/recipeSort";

type CatalogRecipe = Recipe & { maxYield: number };

export default function RecipeCatalog({ recipes, loading, onEdit, onProduce, editing = false }: {
  recipes: CatalogRecipe[];
  loading: boolean;
  editing?: boolean;
  onEdit: (recipe: Recipe, trigger: HTMLButtonElement) => void;
  onProduce: (recipe: Recipe) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<RecipeSort>("recent");
  const categories = [...new Set(recipes.map((recipe) => recipe.category))].sort((a, b) => a.localeCompare(b, "fr"));
  if (category !== "all" && !loading && !categories.some((value) => value === category)) setCategory("all");
  const query = search.trim().toLocaleLowerCase("fr");
  const visible = sortRecipes(recipes.filter((recipe) => (category === "all" || recipe.category === category) &&
    `${recipe.name} ${recipe.ingredients.map((ingredient) => ingredient.productName).join(" ")}`.toLocaleLowerCase("fr").includes(query)), sort);

  const selected = recipes.find((recipe) => recipe.id === selectedId);
  if (selected) return <RecipeDetail recipe={selected} editing={editing} onBack={() => { setSelectedId(null); requestAnimationFrame(() => document.getElementById(`recipe-detail-trigger-${selected.id}`)?.focus()); }} onEdit={onEdit} onProduce={onProduce} />;

  return <section className="recipe-catalog" aria-label="Catalogue des recettes">
    <div className="recipe-catalog-filters">
      <label>Rechercher une recette ou un ingrédient<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou ingrédient" /></label>
      <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Toutes les catégories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <label>Trier par<select value={sort} onChange={(event) => setSort(event.target.value as RecipeSort)}>
        <option value="recent">Plus récentes</option><option value="name">Nom de A à Z</option>
      </select></label>
    </div>
    {loading ? <p role="status">Chargement du catalogue…</p> : visible.length === 0 ? <p role="status" className="recipe-catalog-empty">{recipes.length === 0 ? "Aucune recette enregistrée." : "Aucune recette ne correspond à ces filtres."}</p> :
      <div className="recipe-catalog-grid">{visible.map((recipe) => <article className="recipe-catalog-card" key={recipe.id}>
        <div className="recipe-catalog-card-heading"><h3>{recipe.name}</h3><span>{recipe.category}</span></div>
        <p className="recipe-catalog-meta"><Clock size={14} aria-hidden="true" /> {recipe.prepTime} min · {recipe.yieldPortions} portions par lot</p>
        <div className="recipe-catalog-availability"><span>Disponibilité</span><strong className={recipe.ingredients.length === 0 ? undefined : recipe.maxYield > 0 ? "is-available" : "is-limited"}>{recipe.ingredients.length === 0 ? "Ingrédients à renseigner" : recipe.maxYield > 0 ? `Jusqu’à ${recipe.maxYield} portions sous réserve` : "Stock insuffisant ou à vérifier"}</strong></div>
        <div className="recipe-catalog-actions"><Button id={`recipe-detail-trigger-${recipe.id}`} size="sm" variant="outline" aria-label={`Voir la recette ${recipe.name}`} onClick={() => setSelectedId(recipe.id)}>Voir la recette</Button><Button size="sm" variant="outline" aria-label={`Modifier la recette ${recipe.name}`} disabled={editing} onClick={(event) => onEdit(recipe, event.currentTarget)}>Modifier</Button>
          {recipe.maxYield > 0 && <Button size="sm" aria-label={`Produire ${recipe.name}`} onClick={() => onProduce(recipe)}>Produire</Button>}</div>
      </article>)}</div>}
  </section>;
}
