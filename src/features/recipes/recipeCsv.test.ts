import { describe, expect, it } from "vitest";
import type { Product } from "../../types";
import { mapRecipeColumns, parseRecipeCsv, readRecipeCsvFile, validateImportRows } from "./recipeCsv";

const products = [{ id: "a", name: "Farine", unit: "kg" }, { id: "b", name: "Œuf", unit: "pcs" }] as Product[];
describe("import CSV de fiche", () => {
  it("refuse un fichier trop volumineux, mal encodé ou de plus de 100 lignes", async () => {
    const arrayBuffer = async () => new Uint8Array([0xff]).buffer;
    await expect(readRecipeCsvFile({ size: 256_001, arrayBuffer })).rejects.toThrow("256 Ko");
    await expect(readRecipeCsvFile({ size: 1, arrayBuffer })).rejects.toThrow("UTF-8");
    expect(() => parseRecipeCsv(`nom,quantité,unité\n${"a,1,kg\n".repeat(101)}`)).toThrow("100 ingrédients");
  });
  it("lit BOM, guillemets doublés, séparateurs et retours dans les champs", () => {
    const file = parseRecipeCsv('\uFEFFArticle;Quantité;Unité\r\n"Farine; ""bio""";"1,25";kg\r\n"Œuf\nplein air";2;pcs');
    expect(file.headers).toEqual(["Article", "Quantité", "Unité"]);
    expect(file.rows.map((row) => row.fields)).toEqual([['Farine; "bio"', "1,25", "kg"], ["Œuf\nplein air", "2", "pcs"]]);
    expect(file.rows.map((row) => row.line)).toEqual([2, 3]);
  });
  it("refuse un CSV mal formé, des colonnes ambiguës ou dupliquées", () => {
    expect(() => parseRecipeCsv('a,b,c\n"non fermé')).toThrow();
    expect(() => parseRecipeCsv('Article,article,unité\na,b,kg')).toThrow("distincts");
    expect(() => parseRecipeCsv('a,b,c\n1,2')).toThrow("même nombre");
    expect(() => mapRecipeColumns(parseRecipeCsv('a,b,c\n1,2,3'), { product: 0, quantity: 0, unit: 2 })).toThrow("différentes");
  });
  it("exige une association unique, une unité identique et des quantités valides", () => {
    const rows = mapRecipeColumns(parseRecipeCsv('Article;Quantité;Unité\nFarine;1,25;kg\nŒuf;2;pcs'), { product: 0, quantity: 1, unit: 2 });
    rows[0].productId = "a"; rows[1].productId = "b";
    expect(validateImportRows(rows, products)).toEqual({ errors: [], ingredients: [{ productId: "a", quantity: 1.25 }, { productId: "b", quantity: 2 }] });
    expect(validateImportRows([{ ...rows[0], unit: "g" }, { ...rows[1], productId: "a" }], products).errors.join(" ")).toMatch(/unité.*déjà associé/i);
    expect(validateImportRows([{ ...rows[1], quantity: "1,5" }], products).errors.join(" ")).toMatch(/entière/);
    expect(validateImportRows([{ ...rows[0], quantity: "0" }], products).errors.join(" ")).toMatch(/quantité positive/);
  });
});
