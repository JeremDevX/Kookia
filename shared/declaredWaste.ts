export interface DeclaredWasteRecord {
  id: string; operationId: string; serviceDate: string; serviceSlot: string | null;
  kind: string; avoidability: string; productId: string | null; productName: string | null;
  productionId: string | null; preparationName: string | null; lotId: string | null;
  quantity: number; unit: string; note: string; stockMovementId: string | null; knownCost: number | null;
}
export interface DeclaredWasteSummary {
  records: DeclaredWasteRecord[];
  totals: Array<{ kind: string; avoidability: string; unit: string; quantity: number; recordCount: number }>;
  excludedSimulationCount: number;
}
export const wasteKindLabels: Record<string, string> = { raw: "Matière brute", preparation: "Déchet de préparation", unsold: "Invendu écarté", plate_return: "Retour d’assiette" };
