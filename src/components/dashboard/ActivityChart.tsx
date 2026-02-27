import React from "react";
import Card from "../common/Card";
import { Zap } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MOCK_DASHBOARD_ACTIVITY } from "../../utils/mockData";

const ActivityChart: React.FC = () => {
  return (
    <Card title="📊 Activité & Prévisions" className="h-full flex flex-col">
      <div className="chart-container flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={MOCK_DASHBOARD_ACTIVITY}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#218083" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#218083" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E6C2AD"
              opacity={0.5}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              dy={10}
              fontSize={12}
              tick={{ fill: "#627C7F" }}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              tick={{ fill: "#627C7F" }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              fontSize={12}
              tick={{ fill: "#627C7F" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFFFFD",
                borderRadius: "8px",
                border: "1px solid #E6C2AD",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                color: "#134252",
              }}
            />
            <Legend iconType="circle" />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              fill="url(#colorRevenue)"
              stroke="#218083"
              name="CA Prévisionnel (€)"
            />
            <Bar
              yAxisId="right"
              dataKey="reservations"
              barSize={20}
              fill="#1F212F"
              radius={[4, 4, 0, 0]}
              name="Réservations"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="consumption"
              stroke="#A84B2F"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Sortie Stock (kg)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        <h4 className="text-sm font-bold mb-2 flex items-center gap-sm">
          <Zap size={14} className="text-moderate" /> Insight IA
        </h4>
        <p className="text-sm text-secondary">
          Forte corrélation détectée : +10% de réservations entraîne{" "}
          <strong>+8kg de sortie stock</strong>. Anticipez vos commandes pour
          Samedi.
        </p>
      </div>
    </Card>
  );
};

export default ActivityChart;
