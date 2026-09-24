import { describe, expect, it } from "vitest";
import { groupOrderLinesBySupplier } from "./supplierOrderSheets";

const line = (id: string, supplierId: string, supplierName: string) => ({
  id, productId: `product-${id}`, productName: `Article ${id}`, supplierId, supplierName,
  quantity: 2, receivedQuantity: 0, remainingQuantity: 2, unit: "kg", pricePerUnit: 3.5,
});

describe("groupOrderLinesBySupplier", () => {
  it("creates one supplier sheet per supplier and keeps order-line snapshots intact", () => {
    const sheets = groupOrderLinesBySupplier([
      line("1", "supplier-b", "Boucherie"),
      line("2", "supplier-a", "Primeur"),
      line("3", "supplier-b", "Boucherie"),
    ]);

    expect(sheets.map(({ supplierId, supplierName }) => [supplierId, supplierName]))
      .toEqual([["supplier-b", "Boucherie"], ["supplier-a", "Primeur"]]);
    expect(sheets[0].lines.map(({ id, quantity, unit, pricePerUnit }) => [id, quantity, unit, pricePerUnit]))
      .toEqual([["1", 2, "kg", 3.5], ["3", 2, "kg", 3.5]]);
  });
});
