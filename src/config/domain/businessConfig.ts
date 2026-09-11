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

export interface DomainBusinessConfig {
  roiSimulator: RoiSimulatorAssumptionsConfig;
}

export const domainBusinessConfig: DomainBusinessConfig = {
  roiSimulator: {
    defaultWasteReductionPercent: 30,
    defaultDailyCovers: 350,
    averageTicketEur: 25,
    wastePerCoverKg: 0.18,
    foodCostPerKgEur: 6,
    co2PerKgFood: 2.5,
    openDaysPerYear: 300,
    wasteReductionRange: {
      min: 5,
      max: 80,
    },
    dailyCoversRange: {
      min: 50,
      max: 1000,
      step: 10,
    },
  },
};
