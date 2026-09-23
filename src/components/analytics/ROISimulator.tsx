import React, { useState } from "react";
import Card from "../common/Card";
import { Calculator } from "lucide-react";
import type { RoiSimulatorAssumptionsConfig } from "../../config/domain/businessConfig";
import "./ROISimulator.css";

const ROISimulator: React.FC<{ roiSimulator: RoiSimulatorAssumptionsConfig }> = ({ roiSimulator }) => {
  const [wasteReduction, setWasteReduction] = useState(
    roiSimulator.defaultWasteReductionPercent
  );
  const [dailyCovers, setDailyCovers] = useState(roiSimulator.defaultDailyCovers);

  const totalWasteKgPerYear =
    dailyCovers * roiSimulator.wastePerCoverKg * roiSimulator.openDaysPerYear;
  const savedWasteKg = totalWasteKgPerYear * (wasteReduction / 100);
  const moneySaved = savedWasteKg * roiSimulator.foodCostPerKgEur;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Card className="roi-simulator h-full">
      <div className="card-header">
        <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
          <Calculator size={24} /> Simuler une baisse des pertes
        </h3>
        <p className="text-sm text-secondary mt-1">
          Simulation à partir d’hypothèses d’exemple, pas de vos ventes.
        </p>
      </div>

      <div className="slider-container">
        <div className="slider-label">
          <span>Baisse des pertes envisagée</span>
          <span className="slider-value">{wasteReduction}%</span>
        </div>
        <input
          type="range"
          aria-label="Objectif de réduction du gaspillage"
          min={roiSimulator.wasteReductionRange.min}
          max={roiSimulator.wasteReductionRange.max}
          value={wasteReduction}
          onChange={(e) => setWasteReduction(Number(e.target.value))}
          className="custom-range"
        />
      </div>

      <div className="slider-container">
        <div className="slider-label">
          <span>Couverts par jour</span>
          <span className="slider-value">{dailyCovers}</span>
        </div>
        <input
          type="range"
          aria-label="Couverts par jour"
          min={roiSimulator.dailyCoversRange.min}
          max={roiSimulator.dailyCoversRange.max}
          step={roiSimulator.dailyCoversRange.step}
          value={dailyCovers}
          onChange={(e) => setDailyCovers(Number(e.target.value))}
          className="custom-range"
        />
      </div>

      <div className="roi-result">
        <span className="text-sm font-semibold text-secondary uppercase tracking-wider">
          Économies annuelles du scénario
        </span>
        <span className="roi-amount">{formatCurrency(moneySaved)}</span>

      </div>
    </Card>
  );
};

export default ROISimulator;
