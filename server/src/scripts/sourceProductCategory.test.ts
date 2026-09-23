import { describe, expect, it } from "vitest";
import { sourceProductCategory } from "./sourceProductCategory.js";

describe("source invoice product categories", () => {
  it.each([
    ["Merguez", "Boucherie Robin", "Charcuterie"],
    ["Cœur tendre de tranche UE, 4 kg et plus", "RPDA / Relais d’Or", "Viandes"],
    ["Jaune d’œuf liquide, bidon 1 kg", "RPDA / Relais d’Or", "Frais"],
    ["Pilons de poulet France, barquette de 2 kg", "Promocash", "Viandes"],
    ["Paic citron vert, 750 ml", "Carrefour", "Hygiène et entretien"],
    ["Pap toil Jumbo 2P 180M", "EpiSaveurs", "Hygiène et entretien"],
    ["Couv pot sce 30cc sac", "EpiSaveurs", "Emballages et service"],
    ["Tomates concassées 4/4", "Promocash", "Épicerie"],
    ["Farine « me crème » type 65", "Promocash", "Épicerie"],
    ["Crème marron 4/4 992g", "EpiSaveurs", "Épicerie"],
    ["Ricola orange-menthe", "Carrefour", "Épicerie"],
    ["Pépites framboise", "Valrhona", "Pâtisserie"],
    ["Poire PAD France, sous vide", "RPDA / Relais d’Or", "Viandes"],
    ["Produit non identifié, libellé masqué", "Promocash", "À identifier"],
  ])("categorizes %s", (name, supplier, expected) => {
    expect(sourceProductCategory(name, supplier)).toBe(expected);
  });
});
