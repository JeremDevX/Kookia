import type { ServiceSlot } from "./serviceCalendar.js";
import type { MenuEntry, SheetInput } from "./serviceOperations.js";
import type { ForecastService } from "./operationalForecast.js";
import type { WeatherDecisionContext } from "./serviceWeather.js";

export interface ServiceSheetLine {
  recipeId: string; recipeName: string; planned: number; adjustedPlanned: number;
  prepared: number; additionalPrepared: number; refused: number; soldObserved: number; sold: number | null;
  preparationLosses: { quantity: number; unit: string }[]; plateReturns: number; unsold: number | null;
  retained: number; discarded: number; recordedUnsoldWaste: number;
  unexplained: number | null; explanation: string[];
}
export interface ServiceSheetFacts {
  menuRevision: number; productionIds: string[]; refusalIds: string[]; unallocatedRefusals: number;
  saleRevisions: { id: string; revision: number; allocationRevision: number }[];
  wasteIds: string[]; coverage: "missing" | "partial" | "complete";
  unallocatedSales: number; unallocatedProductions: number; unmappedSales: number;
  staleAllocations: number; lines: ServiceSheetLine[]; gaps: string[];
  dailyRefunds: { id: string; saleId: string | null; serviceDate: string; serviceSlot: null;
    saleItemName: string; recordedAt: string; reason: string; amount: null }[];
}
export interface ServiceSheet {
  serviceDate: string; slot: ServiceSlot; revision: number; state: "draft" | "validated" | "closed";
  planned: SheetInput["planned"]; outcomes: SheetInput["outcomes"]; substitutions: SheetInput["substitutions"];
  note: string; menuEntries: MenuEntry[]; menuRevision: number;
  validatedAt: string | null; validatedBy: string | null; closedAt: string | null; closedBy: string | null;
  forecastKey: string | null; forecastReference: ForecastService | null;
  weatherContext?: WeatherDecisionContext;
  facts: ServiceSheetFacts; factsChangedSinceClosure: boolean; closureFacts: ServiceSheetFacts | null;
}
