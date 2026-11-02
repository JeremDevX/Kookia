export function hasPendingServiceSheetFields(fields: {
  recipeId: string; portions: number; fromRecipeId: string; toRecipeId: string;
  replacementPortions: number; replacementNote: string;
}): boolean {
  return Boolean(fields.recipeId || fields.portions || fields.fromRecipeId || fields.toRecipeId ||
    fields.replacementPortions !== 1 || fields.replacementNote);
}
