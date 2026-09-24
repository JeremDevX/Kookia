import type { PurchaseOrder } from "../../services/orderService";

export type SupplierOrderSheet = {
  supplierId: string;
  supplierName: string;
  lines: PurchaseOrder["lines"];
};

export function groupOrderLinesBySupplier(lines: PurchaseOrder["lines"]): SupplierOrderSheet[] {
  const groups = new Map<string, SupplierOrderSheet>();
  for (const line of lines) {
    const group = groups.get(line.supplierId);
    if (group) group.lines.push(line);
    else groups.set(line.supplierId, { supplierId: line.supplierId, supplierName: line.supplierName, lines: [line] });
  }
  return [...groups.values()].sort((left, right) => left.supplierName.localeCompare(right.supplierName, "fr"));
}
