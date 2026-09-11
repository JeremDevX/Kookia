export interface Notification {
  id: string;
  type: "warning" | "alert" | "info";
  title: string;
  message: string;
  time: string;
  createdAt: string;
  read: boolean;
  // Fields for quick cart feature
  actionable?: boolean;
  productId?: string;
  productName?: string;
  suggestedQuantity?: number;
  unit?: string;
  currentStock?: number;
  estimatedRunout?: string;
}

// Styles pour les badges d'icônes professionnels - Couleurs DA
export const iconBadgeStyles = {
  alert: {
    // Teal pour météo/alertes
    background: "#52725b",
    boxShadow: "none",
  },
  warning: {
    // Urgent (rouge) pour warnings
    background: "#a45b43",
    boxShadow: "none",
  },
  info: {
    // Primary (vert) pour infos
    background: "#365a3d",
    boxShadow: "none",
  },
};
