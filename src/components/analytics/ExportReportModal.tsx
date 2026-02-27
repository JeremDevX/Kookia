import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Download, FileText, Calendar } from "lucide-react";
import "./ExportReportModal.css";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, period: string) => void;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [format, setFormat] = useState("pdf");
  const [period, setPeriod] = useState("month");

  const handleExport = () => {
    onExport(format, period);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exporter le rapport AGEC"
      width="md"
    >
      <div className="export-report-modal">
        <div className="export-info-card">
          <div className="export-info-content">
            <FileText className="export-info-icon" size={20} />
            <div>
              <h4 className="export-info-title">
                Rapport AGEC 2025
              </h4>
              <p className="export-info-text">
                Conformité avec la loi anti-gaspillage pour une économie
                circulaire. Ce rapport inclut toutes les métriques requises par
                la réglementation.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="export-section-label">Format d'export</label>
          <div className="export-format-grid">
            <button
              className={`export-format-option ${
                format === "pdf" ? "active" : ""
              }`}
              onClick={() => setFormat("pdf")}
            >
              <div className="export-format-emoji">📄</div>
              <div className="export-format-label">PDF</div>
            </button>
            <button
              className={`export-format-option ${
                format === "excel" ? "active" : ""
              }`}
              onClick={() => setFormat("excel")}
            >
              <div className="export-format-emoji">📊</div>
              <div className="export-format-label">Excel</div>
            </button>
            <button
              className={`export-format-option ${
                format === "csv" ? "active" : ""
              }`}
              onClick={() => setFormat("csv")}
            >
              <div className="export-format-emoji">📋</div>
              <div className="export-format-label">CSV</div>
            </button>
          </div>
        </div>

        <div>
          <label className="export-section-label">Période</label>
          <div className="export-period-row">
            <Calendar size={16} className="text-secondary" />
            <select
              className="export-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
              <option value="custom">Personnalisé...</option>
            </select>
          </div>
        </div>

        <div className="export-content-card">
          <strong>Contenu du rapport:</strong>
          <ul className="export-content-list">
            <li>✓ Gaspillage alimentaire (kg et g/couvert)</li>
            <li>✓ Évolution mensuelle et tendances</li>
            <li>✓ Performance IA et prédictions</li>
            <li>✓ ROI et économies réalisées</li>
            <li>✓ Conformité réglementaire AGEC</li>
          </ul>
        </div>

        <div className="export-actions">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button icon={<Download size={16} />} onClick={handleExport}>
            Télécharger le rapport
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExportReportModal;
