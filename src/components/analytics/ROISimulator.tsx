import React, { useState } from "react";
import Card from "../common/Card";
import { Calculator, TreeDeciduous, TrendingUp } from "lucide-react";
import { domainBusinessConfig } from "../../config/domain/businessConfig";
import "./ROISimulator.css";

const ROISimulator: React.FC = () => {
  const { roiSimulator } = domainBusinessConfig;
  const [wasteReduction, setWasteReduction] = useState(
    roiSimulator.defaultWasteReductionPercent
  );
  const [dailyCovers, setDailyCovers] = useState(roiSimulator.defaultDailyCovers);
  const avgTicket = roiSimulator.averageTicketEur;

  const totalWasteKgPerYear =
    dailyCovers * roiSimulator.wastePerCoverKg * roiSimulator.openDaysPerYear;
  const savedWasteKg = totalWasteKgPerYear * (wasteReduction / 100);
  const moneySaved = savedWasteKg * roiSimulator.foodCostPerKgEur;
  const co2Saved = savedWasteKg * roiSimulator.co2PerKgFood;

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
          <Calculator size={24} /> Simulateur de Rentabilité
        </h3>
        <p className="text-sm text-secondary mt-1">
          Estimez vos gains annuels potentiels avec notre IA.
        </p>
      </div>

      <div className="slider-container">
        <div className="slider-label">
          <span>Réduction Gaspillage Objectif</span>
          <span className="slider-value">{wasteReduction}%</span>
        </div>
        <input
          type="range"
          min={roiSimulator.wasteReductionRange.min}
          max={roiSimulator.wasteReductionRange.max}
          value={wasteReduction}
          onChange={(e) => setWasteReduction(Number(e.target.value))}
          className="custom-range"
        />
      </div>

      <div className="slider-container">
        <div className="slider-label">
          <span>Couverts / Jour</span>
          <span className="slider-value">{dailyCovers}</span>
        </div>
        <input
          type="range"
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
          Économies Annuelles Estimées
        </span>
        <span className="roi-amount">{formatCurrency(moneySaved)}</span>

        <div className="mt-4 flex justify-center gap-3">
          <span className="co2-tag">
            <TreeDeciduous size={14} />
            {Math.round(co2Saved / 1000)}t CO2e évitées
          </span>
          <span className="co2-tag bg-blue-50 text-blue-800">
            <TrendingUp size={14} />
            Marge +
            {(
              (moneySaved /
                (dailyCovers * avgTicket * roiSimulator.openDaysPerYear)) *
              100
            ).toFixed(1)}
            %
            pts
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ROISimulator;
