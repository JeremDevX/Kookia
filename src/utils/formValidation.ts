import type { Unit } from "../types";

export interface AddProductFormValues {
  name: string;
  category: string;
  currentStock: string;
  unit: Unit;
  minThreshold: string;
  pricePerUnit: string;
}

export interface RecordProductionFormValues {
  recipeName: string;
  portions: string;
  prepTime: string;
  notes: string;
}

export type AddProductFormErrors = Partial<
  Record<"name" | "category" | "currentStock" | "unit" | "minThreshold" | "pricePerUnit", string>
>;
export type RecordProductionFormErrors = Partial<
  Record<"recipeName" | "portions" | "prepTime" | "notes", string>
>;

const PRODUCT_CATEGORIES = new Set([
  "Légumes",
  "Fromages",
  "Frais",
  "Viandes",
  "Epicerie",
  "Charcuterie",
]);
const PRODUCT_UNITS = new Set<Unit>(["kg", "L", "pcs", "dz"]);

function parsePositiveNumber(input: string): number {
  return Number.parseFloat(input.trim());
}

function parseInteger(input: string): number {
  return Number.parseInt(input.trim(), 10);
}

export function validateAddProductForm(
  values: AddProductFormValues
): { isValid: boolean; errors: AddProductFormErrors } {
  const errors: AddProductFormErrors = {};

  const name = values.name.trim();
  if (!name) {
    errors.name = "Le nom du produit est requis.";
  } else if (name.length > 80) {
    errors.name = "Le nom du produit doit contenir au maximum 80 caracteres.";
  }

  if (!PRODUCT_CATEGORIES.has(values.category)) {
    errors.category = "Categorie invalide.";
  }

  if (!PRODUCT_UNITS.has(values.unit)) {
    errors.unit = "Unite invalide.";
  }

  const currentStock = parsePositiveNumber(values.currentStock);
  if (!values.currentStock.trim()) {
    errors.currentStock = "Le stock initial est requis.";
  } else if (!Number.isFinite(currentStock) || currentStock < 0) {
    errors.currentStock = "Le stock initial doit etre un nombre positif ou nul.";
  } else if (currentStock > 100000) {
    errors.currentStock = "Le stock initial depasse la borne autorisee (100000).";
  }

  if (values.minThreshold.trim()) {
    const minThreshold = parseInteger(values.minThreshold);
    if (!Number.isFinite(minThreshold) || minThreshold < 0) {
      errors.minThreshold = "Le seuil minimum doit etre un entier positif ou nul.";
    } else if (minThreshold > 100000) {
      errors.minThreshold = "Le seuil minimum depasse la borne autorisee (100000).";
    }
  }

  const pricePerUnit = parsePositiveNumber(values.pricePerUnit);
  if (!values.pricePerUnit.trim()) {
    errors.pricePerUnit = "Le prix unitaire est requis.";
  } else if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
    errors.pricePerUnit = "Le prix unitaire doit etre strictement positif.";
  } else if (pricePerUnit > 10000) {
    errors.pricePerUnit = "Le prix unitaire depasse la borne autorisee (10000).";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateRecordProductionForm(
  values: RecordProductionFormValues
): { isValid: boolean; errors: RecordProductionFormErrors } {
  const errors: RecordProductionFormErrors = {};

  const recipeName = values.recipeName.trim();
  if (!recipeName) {
    errors.recipeName = "Le nom de la recette est requis.";
  } else if (recipeName.length > 120) {
    errors.recipeName = "Le nom de la recette doit contenir au maximum 120 caracteres.";
  }

  const portions = parseInteger(values.portions);
  if (!values.portions.trim()) {
    errors.portions = "Le nombre de portions est requis.";
  } else if (!Number.isFinite(portions) || portions < 1) {
    errors.portions = "Le nombre de portions doit etre un entier superieur ou egal a 1.";
  } else if (portions > 10000) {
    errors.portions = "Le nombre de portions depasse la borne autorisee (10000).";
  }

  if (values.prepTime.trim()) {
    const prepTime = parseInteger(values.prepTime);
    if (!Number.isFinite(prepTime) || prepTime < 0) {
      errors.prepTime = "Le temps de preparation doit etre un entier positif ou nul.";
    } else if (prepTime > 1440) {
      errors.prepTime = "Le temps de preparation depasse la borne autorisee (1440 min).";
    }
  }

  const notes = values.notes.trim();
  if (notes.length > 500) {
    errors.notes = "Les notes doivent contenir au maximum 500 caracteres.";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateProductionQuantity(
  quantity: string,
  maxYield: number
): { isValid: boolean; normalizedQuantity: number; error?: string } {
  const safeMaxYield = Math.max(1, Math.floor(maxYield));
  const parsedQuantity = parseInteger(quantity);

  if (!quantity.trim()) {
    return {
      isValid: false,
      normalizedQuantity: safeMaxYield,
      error: "La quantite est requise.",
    };
  }

  if (!Number.isFinite(parsedQuantity)) {
    return {
      isValid: false,
      normalizedQuantity: safeMaxYield,
      error: "La quantite doit etre un entier valide.",
    };
  }

  if (parsedQuantity < 1 || parsedQuantity > safeMaxYield) {
    return {
      isValid: false,
      normalizedQuantity: Math.min(Math.max(parsedQuantity, 1), safeMaxYield),
      error: `La quantite doit etre comprise entre 1 et ${safeMaxYield}.`,
    };
  }

  return {
    isValid: true,
    normalizedQuantity: parsedQuantity,
  };
}
