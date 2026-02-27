import React, { useState } from "react";
import Card from "../common/Card";
import { Calculator, TreeDeciduous, TrendingUp } from "lucide-react";
import "./ROISimulator.css";

const ROISimulator: React.FC = () => {
  const [wasteReduction, setWasteReduction] = useState(30);
  const [dailyCovers, setDailyCovers] = useState(350);
  const [avgTicket] = useState(25);

  // Constants based on market research
  const WASTE_PER_COVER_KG = 0.18; // 180g avg France traditional
  const FOOD_COST_PER_KG = 6; // Average food cost
  const CO2_PER_KG_FOOD = 2.5; // Approx CO2 impact

  // Calculations
  const totalWasteKgPerYear = dailyCovers * WASTE_PER_COVER_KG * 300; // 300 days open
  const savedWasteKg = totalWasteKgPerYear * (wasteReduction / 100);
  const moneySaved = savedWasteKg * FOOD_COST_PER_KG;
  const co2Saved = savedWasteKg * CO2_PER_KG_FOOD;

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
          min="5"
          max="80"
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
          min="50"
          max="1000"
          step="10"
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
            {((moneySaved / (dailyCovers * avgTicket * 300)) * 100).toFixed(1)}%
            pts
          </span>
        </div>
      </div>
    </Card>
  );
};

export default ROISimulator;
