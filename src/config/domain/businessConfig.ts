export interface EstablishmentDisplayConfig {
  managerFirstName: string;
  city: string;
  weatherLabel: string;
}

export interface MenuSuggestionConfig {
  starter: string;
  main: string;
  dessert: string;
  stockOptimizationText: string;
  reclaimedStockKg: number;
  criticalWindowHours: number;
}

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
  establishmentDisplay: EstablishmentDisplayConfig;
  menuSuggestion: MenuSuggestionConfig;
  roiSimulator: RoiSimulatorAssumptionsConfig;
}

export const domainBusinessConfig: DomainBusinessConfig = {
  establishmentDisplay: {
    managerFirstName: "Camille",
    city: "Grenoble",
    weatherLabel: "☀️ 18°C",
  },
  menuSuggestion: {
    starter: "Salade Caprese au Basilic Frais",
    main: "Poulet Rôti aux Herbes & Pommes Grenailles",
    dessert: "Tiramisu Maison",
    stockOptimizationText:
      "Optimisé pour vos stocks de Tomates (Date courte) et Poulet.",
    reclaimedStockKg: 4.5,
    criticalWindowHours: 48,
  },
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
