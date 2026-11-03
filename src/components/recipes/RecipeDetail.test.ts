import { Children, createElement, isValidElement, useState, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import RecipeDetail from "./RecipeDetail";

vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
  useRef: vi.fn(() => ({ current: null })),
  useEffect: vi.fn(),
}));

it("affiche les ingrédients enregistrés et signale les étapes absentes", () => {
  const html = renderToStaticMarkup(createElement(RecipeDetail, {
    recipe: { id: "r1", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 4,
      revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 4,
      ingredients: [{ productId: "p1", productName: "Carotte", quantity: 500, unit: "g" }] },
    editing: false, onBack: () => {}, onEdit: () => {}, onProduce: () => {},
  }));
  expect(html).toContain("Soupe");
  expect(html).toContain("Carotte");
  expect(html).toContain("500 g");
  expect(html).toContain("Étapes non renseignées.");
  expect(html).toContain("Produire");
});


it("affiche les étapes dans leur ordre", () => {
  const html = renderToStaticMarkup(createElement(RecipeDetail, {
    recipe: { id: "r", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 4,
      revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 0, ingredients: [], steps: ["Laver", "Cuire"] },
    editing: false, onBack: () => {}, onEdit: () => {}, onProduce: () => {},
  }));
  expect(html).toContain("<ol><li>Laver</li><li>Cuire</li></ol>");
});


it("adapte les quantités aux portions demandées sans enregistrer de production", () => {
  vi.mocked(useState).mockImplementationOnce(() => ["2", vi.fn()] as never);
  const onProduce = vi.fn();
  const html = renderToStaticMarkup(createElement(RecipeDetail, {
    recipe: { id: "r1", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 4,
      revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 4,
      ingredients: [{ productId: "p1", productName: "Carotte", quantity: 500, unit: "g" }] },
    editing: false, onBack: () => {}, onEdit: () => {}, onProduce,
  }));
  expect(html).toContain("250 g");
  expect(html).toContain("production se confirme séparément");
  expect(onProduce).not.toHaveBeenCalled();
});


it("transmet les portions choisies et bloque une saisie invalide", () => {
  const recipe = { id: "r1", name: "Soupe", category: "Entrée" as const, prepTime: 20, yieldPortions: 4,
    revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 4,
    ingredients: [{ productId: "p1", productName: "Carotte", quantity: 500, unit: "g" }] };
  const onProduce = vi.fn();
  const findButton = (node: unknown): ReactElement<{ children?: unknown; disabled?: boolean; onClick: () => void }> | undefined => {
    if (!isValidElement<{ children?: unknown; disabled?: boolean; onClick: () => void }>(node)) return;
    if (node.props.children === "Produire") return node;
    for (const child of Children.toArray(node.props.children as never)) { const found = findButton(child); if (found) return found; }
  };
  vi.mocked(useState).mockImplementationOnce(() => ["2", vi.fn()] as never);
  findButton(RecipeDetail({ recipe, editing: false, onBack: vi.fn(), onEdit: vi.fn(), onProduce }))!.props.onClick();
  expect(onProduce).toHaveBeenCalledWith(recipe, 2);
  vi.mocked(useState).mockImplementationOnce(() => ["", vi.fn()] as never);
  expect(findButton(RecipeDetail({ recipe, editing: false, onBack: vi.fn(), onEdit: vi.fn(), onProduce }))!.props.disabled).toBe(true);
});


it("signale et bloque une fraction de pièce impossible à produire", () => {
  vi.mocked(useState).mockImplementationOnce(() => ["1", vi.fn()] as never);
  const html = renderToStaticMarkup(createElement(RecipeDetail, {
    recipe: { id: "r1", name: "Soupe", category: "Entrée", prepTime: 20, yieldPortions: 2,
      revision: 1, version: 1, effectiveFrom: null, versions: [], maxYield: 4,
      ingredients: [{ productId: "p1", productName: "Œuf", quantity: 1, unit: "pcs" }] },
    editing: false, onBack: () => {}, onEdit: () => {}, onProduce: vi.fn(),
  }));
  expect(html).toContain("Production impossible pour ces portions");
  expect(html).toContain("Impossible à produire");
  expect(html).toMatch(/<button[^>]*disabled[^>]*>Produire<\/button>/);
});
