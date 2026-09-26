import type { MenuEntryInput, ServiceMenu } from "../../../shared/serviceOperations";
export function menuDraft(menu: ServiceMenu): MenuEntryInput[] {
  return menu.entries.map(({ id, name, category, saleItemId, available, priceCents, components }) => ({
    id, name, category, saleItemId, available, priceCents,
    components: components.map(({ recipeId, portions }) => ({ recipeId, portions })),
  }));
}
export function newMenuEntry(): MenuEntryInput {
  return { id: crypto.randomUUID(), name: "", category: "Plat", saleItemId: null, available: true,
    priceCents: Number.NaN, components: [{ recipeId: "", portions: 1 }] };
}
export const menuCategoryLabels = ["Entrée", "Plat", "Dessert", "Boisson", "Formule"] as const;
