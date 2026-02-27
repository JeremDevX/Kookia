import React from "react";
import Card from "../../common/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AnalyticsData } from "../../../types";

interface WasteChartProps {
  stats: AnalyticsData["wasteStats"];
  evolution: AnalyticsData["wasteEvolution"];
}

const WasteChart: React.FC<WasteChartProps> = ({ stats, evolution }) => {
  return (
    <Card title="📉 Gaspillage Alimentaire" className="stat-card">
      <div className="metric-comparison">
        <div className="metric-item">
          <div className="metric-item-label">Total ce mois</div>
          <div className="kpi-value red" style={{ fontSize: "2rem" }}>
            {stats.totalWasteKg} kg
          </div>
          <div className="trend-pill positive" style={{ marginTop: "8px" }}>
            ↓ {stats.monthlyTrend}% vs mois dernier
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-item-label">Par couvert</div>
          <div className="kpi-value" style={{ fontSize: "2rem" }}>
            {stats.wastePerMealGram}g
          </div>
          <div className="text-xs text-secondary mt-2">
            Cible:{" "}
            <strong className="text-optimal">
              {stats.targetWastePerMealGram}g
            </strong>
          </div>
        </div>
      </div>

      <div className="chart-wrapper">
        <h4>Évolution Hebdomadaire</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={evolution}>
            <XAxis
              dataKey="name"
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <YAxis fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Bar
              dataKey="waste"
              fill="url(#wasteGradient)"
              radius={[8, 8, 0, 0]}
              name="Gaspillage (kg)"
            />
            <Bar
              dataKey="target"
              fill="#E6C2AD"
              radius={[8, 8, 0, 0]}
              name="Cible"
              opacity={0.6}
            />
            <defs>
              <linearGradient id="wasteGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E63946" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#C0152F" stopOpacity={0.7} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default WasteChart;
