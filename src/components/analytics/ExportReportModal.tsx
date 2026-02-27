import React, { useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Download, FileText, Calendar } from "lucide-react";

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
      <div className="flex flex-col gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <FileText className="text-blue-600 mt-1" size={20} />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                Rapport AGEC 2025
              </h4>
              <p className="text-sm text-blue-800">
                Conformité avec la loi anti-gaspillage pour une économie
                circulaire. Ce rapport inclut toutes les métriques requises par
                la réglementation.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Format d'export
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                format === "pdf"
                  ? "border-primary bg-primary-light text-primary font-semibold"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setFormat("pdf")}
            >
              <div className="text-lg mb-1">📄</div>
              <div className="text-xs">PDF</div>
            </button>
            <button
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                format === "excel"
                  ? "border-primary bg-primary-light text-primary font-semibold"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setFormat("excel")}
            >
              <div className="text-lg mb-1">📊</div>
              <div className="text-xs">Excel</div>
            </button>
            <button
              className={`p-3 border-2 rounded-lg text-center transition-all ${
                format === "csv"
                  ? "border-primary bg-primary-light text-primary font-semibold"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setFormat("csv")}
            >
              <div className="text-lg mb-1">📋</div>
              <div className="text-xs">CSV</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Période</label>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-secondary" />
            <select
              className="flex-1 px-3 py-2 border rounded-md"
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

        <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600">
          <strong>Contenu du rapport:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>✓ Gaspillage alimentaire (kg et g/couvert)</li>
            <li>✓ Évolution mensuelle et tendances</li>
            <li>✓ Performance IA et prédictions</li>
            <li>✓ ROI et économies réalisées</li>
            <li>✓ Conformité réglementaire AGEC</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 mt-4">
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
