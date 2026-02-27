import React from "react";
import Card from "../../common/Card";
import { Brain } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { AnalyticsData } from "../../../types";

interface AITrendChartProps {
  reliability: AnalyticsData["aiReliability"];
  criticalProducts: AnalyticsData["criticalProducts"];
  predictionCount: number;
}

const AITrendChart: React.FC<AITrendChartProps> = ({
  reliability,
  criticalProducts,
  predictionCount,
}) => {
  return (
    <Card title="🤖 Performance de l'IA" className="stat-card">
      <div className="stat-card-header">
        <div>
          <span className="kpi-label">Précision Globale</span>
          <div className="kpi-value green">
            {reliability.correctPredictions}%
          </div>
          <div className="text-xs text-secondary mt-2">
            Basé sur {predictionCount} prédictions
          </div>
        </div>
        <div className="stat-card-icon">
          <Brain size={28} />
        </div>
      </div>

      <div className="chart-wrapper">
        <h4>Évolution de la Précision (4 Semaines)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={reliability.monthlyTrend}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="name"
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[70, 100]}
              fontSize={10}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#aiGradient)"
              strokeWidth={4}
              dot={{
                r: 6,
                fill: "#218083",
                strokeWidth: 2,
                stroke: "white",
              }}
              activeDot={{ r: 8 }}
            />
            <defs>
              <linearGradient id="aiGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#218083" stopOpacity={1} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-3 text-secondary uppercase tracking-wide">
          Produits à Surveiller
        </h4>
        <div className="product-perf-list">
          {criticalProducts.map((prod, idx) => (
            <div key={idx} className="product-perf-item">
              <span className="font-medium text-sm">{prod.name}</span>
              <div className="flex items-center gap-sm">
                <span className="text-xs text-secondary font-semibold">
                  {prod.accuracy}%
                </span>
                <div className="accuracy-bar-bg">
                  <div
                    className="accuracy-bar-fill"
                    style={{ width: `${prod.accuracy}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default AITrendChart;
