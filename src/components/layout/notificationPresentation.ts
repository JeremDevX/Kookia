export interface Notification {
  id: string;
  type: "warning" | "alert" | "info";
  title: string;
  message: string;
  time: string;
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

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "alert",
    title: "Alerte Météo",
    message:
      "Orages violents prévus demain soir. Impact terrasse estimé : -30%. Réduisez les commandes de produits frais.",
    time: "Il y a 10 min",
    read: false,
    actionable: false,
  },
  {
    id: "n2",
    type: "warning",
    title: "🚨 Stock Critique - Mozzarella",
    message:
      "Stock actuel : 2 kg | Épuisement prévu dans 2 services (~18h). Consommation moyenne : 4 kg/jour.",
    time: "Il y a 1h",
    read: false,
    actionable: true,
    productId: "p2",
    productName: "Mozzarella di Bufala",
    suggestedQuantity: 8,
    unit: "kg",
    currentStock: 2,
    estimatedRunout: "2 services",
  },
  {
    id: "n3",
    type: "warning",
    title: "⚠️ Stock Critique - Tomates",
    message:
      "Stock actuel : 5 kg | Épuisement prévu demain matin. Consommation moyenne : 6 kg/jour.",
    time: "Il y a 2h",
    read: false,
    actionable: true,
    productId: "p1",
    productName: "Tomates San Marzano",
    suggestedQuantity: 15,
    unit: "kg",
    currentStock: 5,
    estimatedRunout: "demain matin",
  },
];

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
