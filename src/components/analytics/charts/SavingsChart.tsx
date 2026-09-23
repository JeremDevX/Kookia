import React from "react";
import Card from "../../common/Card";
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

interface SavingsChartProps {
  evolution: AnalyticsData["savingsEvolution"];
}

const SavingsChart: React.FC<SavingsChartProps> = ({ evolution }) => {
  return (
    <Card className="stat-card">
      <h3 className="section-title">Économies simulées</h3>
      <div className="chart-wrapper mt-4">
        <h4>Exemple d’évolution mensuelle (€)</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={evolution}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis axisLine={false} tickLine={false} fontSize={12} />
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
              dataKey="amount"
              stroke="url(#savingsGradient)"
              strokeWidth={4}
              dot={{
                r: 5,
                fill: "#228B5B",
                strokeWidth: 2,
                stroke: "white",
              }}
              activeDot={{ r: 8 }}
            />
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#228B5B" stopOpacity={1} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0.8} />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default SavingsChart;
