import React from "react";
import Card from "../../common/Card";
import { Target } from "lucide-react";
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
  totalSavings?: string;
  roi?: string;
}

const SavingsChart: React.FC<SavingsChartProps> = ({
  evolution,
  totalSavings = "4 840 €",
  roi = "+4346%",
}) => {
  return (
    <Card className="stat-card">
      <h3 className="section-title flex items-center gap-sm">
        <Target size={20} className="text-optimal" /> Total Économies
      </h3>
      <div className="savings-summary">
        <span className="text-secondary uppercase text-xs font-bold tracking-wider">
          Cumulé depuis le début
        </span>
        <span className="big-saving">{totalSavings}</span>
        <div className="roi-badge">ROI: {roi}</div>
        <p className="text-xs text-secondary mt-2 text-center max-w-xs">
          Basé sur la réduction du gaspillage et l'optimisation des stocks
          comparé à la période N-1.
        </p>
      </div>
      <div className="chart-wrapper mt-4">
        <h4>Évolution des Économies</h4>
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
              fontSize={10}
            />
            <YAxis axisLine={false} tickLine={false} fontSize={10} />
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
