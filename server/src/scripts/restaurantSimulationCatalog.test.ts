import { describe, expect, it } from "vitest";
import { convertSourceLine } from "./restaurantSimulationCatalog.js";
import type { SourceLine } from "./sourceInvoices.js";

const sourceLine = (sourceQuantityText: string): SourceLine => ({ name: "Œufs entiers", quantity: 1, unit: "pcs",
  unitPrice: 24, sourceQuantityText, sourceLineNumber: 1, priceBasis: "stated_unit_price", priceTaxBasis: "HT" });

describe("scenario package conversions", () => {
  it("converts a labelled egg carton into whole eggs at a per-egg price", () => {
    expect(convertSourceLine(sourceLine("1 carton de 12"), "Fournisseur"))
      .toMatchObject({ status: "mapped", conversion: { quantity: 12, product: { unit: "pcs" }, pricePerUnit: 2, basis: "explicit_package" } });
  });

  it("does not turn an unquantified egg carton into one egg", () => {
    expect(convertSourceLine(sourceLine("1 carton"), "Fournisseur"))
      .toEqual({ status: "excluded", reason: "unresolved_packaging" });
  });

  it("excludes prepared food from the ingredient purchase catalog", () => {
    const line: SourceLine = { ...sourceLine("1 kg"), name: "Choucroute royale aux champignons", unit: "kg" };
    expect(convertSourceLine(line, "Fournisseur")).toEqual({ status: "excluded", reason: "outside_demo_menu" });
  });
});
