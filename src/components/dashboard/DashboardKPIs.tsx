import React from "react";
import Card from "../common/Card";
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Zap,
} from "lucide-react";

/**
 * DashboardKPIs Component
 * Displays the key performance indicators for the dashboard.
 * Currently uses hardcoded values as per the original implementation,
 * but can be extended to accept props.
 */
const DashboardKPIs: React.FC = () => {
  return (
    <div className="kpi-grid">
      <Card className="kpi-card hover-lift">
        <div className="flex justify-between items-start mb-md">
          <div className="kpi-icon blue">
            <Users size={24} />
          </div>
          <span className="badge badge-optimal">+12% vs N-1</span>
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Couverts (Hier)</span>
          <div className="kpi-value-row">
            <span className="kpi-value">347</span>
          </div>
          <span className="kpi-subtitle">/ 400 cap.</span>
          {/* KPI Progress Bar */}
          <div className="progress-bar">
            <div className="progress-fill blue" style={{ width: "86%" }}></div>
          </div>
        </div>
      </Card>

      <Card className="kpi-card hover-lift">
        <div className="flex justify-between items-start mb-md">
          <div className="kpi-icon orange">
            <DollarSign size={24} />
          </div>
          <Zap size={16} className="text-moderate" />
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Chiffre d'Affaires</span>
          <div className="kpi-value-row">
            <span className="kpi-value">4 892 €</span>
          </div>
          <span className="kpi-subtitle">ce mois</span>
          <div className="progress-bar">
            <div
              className="progress-fill orange"
              style={{ width: "65%" }}
            ></div>
          </div>
        </div>
      </Card>

      <Card className="kpi-card hover-lift">
        <div className="flex justify-between items-start mb-md">
          <div className="kpi-icon green">
            <TrendingUp size={24} />
          </div>
          <span className="badge badge-optimal">Prévision IA</span>
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Prévus Demain</span>
          <div className="kpi-value-row">
            <span className="kpi-value">420</span>
          </div>
          <span className="kpi-subtitle">clients</span>
          <div className="progress-bar">
            <div className="progress-fill green" style={{ width: "95%" }}></div>
          </div>
        </div>
      </Card>

      <Card className="kpi-card hover-lift">
        <div className="flex justify-between items-start mb-md">
          <div className="kpi-icon red">
            <AlertTriangle size={24} />
          </div>
          <span className="badge badge-optimal kpi-agec-badge">
            <span className="kpi-agec-full">Objectif AGEC</span>
            <span className="kpi-agec-short">AGEC</span>
          </span>
        </div>
        <div className="kpi-content">
          <span className="kpi-label">Gaspillage Est.</span>
          <div className="kpi-value-row">
            <span className="kpi-value text-optimal">-2.3%</span>
          </div>
          <span className="kpi-subtitle">cette semaine</span>
          <div className="progress-bar">
            <div
              className="progress-fill green"
              style={{ width: "100%" }}
            ></div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardKPIs;
