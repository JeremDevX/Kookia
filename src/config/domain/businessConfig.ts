export interface RoiSimulatorAssumptionsConfig {
  defaultWasteReductionPercent: number;
  defaultDailyCovers: number;
  averageTicketEur: number;
  wastePerCoverKg: number;
  foodCostPerKgEur: number;
  co2PerKgFood: number;
  openDaysPerYear: number;
  wasteReductionRange: {
    min: number;
    max: number;
  };
  dailyCoversRange: {
    min: number;
    max: number;
    step: number;
  };
}
