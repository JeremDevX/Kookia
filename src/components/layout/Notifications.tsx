import React, { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CloudRain,
  Lightbulb,
  ShoppingCart,
  Check,
  Loader2,
  ArrowRight,
} from "lucide-react";
import Modal from "../common/Modal";
import OrderGenerator from "../dashboard/OrderGenerator";
import { useToast } from "../../context/ToastContext";
import { useCart, type CartItem } from "../../context/CartContext";
import { MOCK_PRODUCTS, type Prediction } from "../../utils/mockData";

interface Notification {
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

const MOCK_NOTIFICATIONS: Notification[] = [
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
const iconBadgeStyles = {
  alert: {
    // Teal pour météo/alertes
    background: "linear-gradient(135deg, #218083 0%, #1a6668 100%)",
    boxShadow: "0 4px 12px rgba(33, 128, 131, 0.35)",
  },
  warning: {
    // Urgent (rouge) pour warnings
    background: "linear-gradient(135deg, #c0152f 0%, #a01228 100%)",
    boxShadow: "0 4px 12px rgba(192, 21, 47, 0.35)",
  },
  info: {
    // Primary (vert) pour infos
    background: "linear-gradient(135deg, #00c796 0%, #00b386 100%)",
    boxShadow: "0 4px 12px rgba(0, 199, 150, 0.35)",
  },
};

const Notifications: React.FC = () => {
  const { addToast } = useToast();
  const {
    addToCart: addToGlobalCart,
    addMultipleToCart,
    cartCount,
    cartItems,
    clearCart,
  } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [addedToCart, setAddedToCart] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const actionableNotifications = notifications.filter(
    (n) => n.actionable && !addedToCart.includes(n.id)
  );

  const markAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Add single item to cart
  const handleAddToCart = (notif: Notification) => {
    if (!notif.productName || !notif.productId) return;

    setAddedToCart((prev) => [...prev, notif.id]);

    // Add to global cart context
    addToGlobalCart({
      id: notif.id,
      productId: notif.productId,
      productName: notif.productName,
      quantity: notif.suggestedQuantity || 0,
      unit: notif.unit || "kg",
      source: "notification",
    });

    addToast(
      "success",
      "Ajouté au panier",
      `${notif.productName} (${notif.suggestedQuantity} ${notif.unit}) ajouté à la commande.`
    );
  };

  // Add all actionable items to cart with animated processing
  const handleAddAllToCart = async () => {
    if (actionableNotifications.length === 0) {
      addToast(
        "info",
        "Panier à jour",
        "Tous les articles sont déjà dans le panier."
      );
      return;
    }

    setIsProcessing(true);
    const itemsToAdd: typeof actionableNotifications = [];

    // Process each notification with a delay for visual feedback
    for (const notif of actionableNotifications) {
      setProcessingId(notif.id);
      await new Promise((resolve) => setTimeout(resolve, 600)); // 600ms per item
      setAddedToCart((prev) => [...prev, notif.id]);
      if (notif.productId && notif.productName) {
        itemsToAdd.push(notif);
      }
    }

    // Add all to global cart
    addMultipleToCart(
      itemsToAdd.map((n) => ({
        id: n.id,
        productId: n.productId!,
        productName: n.productName!,
        quantity: n.suggestedQuantity || 0,
        unit: n.unit || "kg",
        source: "notification" as const,
      }))
    );

    setProcessingId(null);
    setIsProcessing(false);

    // Summary toast
    addToast(
      "success",
      "Commande prête !",
      `${actionableNotifications.length} article(s) ajouté(s). Cliquez sur "Générer la commande" pour continuer.`
    );
  };

  // Convert cart items to Prediction format for OrderGenerator
  const cartPredictions: Prediction[] = cartItems.map((item: CartItem) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      predictedDate: new Date().toISOString().split("T")[0],
      predictedConsumption: item.quantity,
      confidence: 0.95,
      recommendation: {
        action: "buy" as const,
        quantity: item.quantity,
        reason: `Depuis notifications - ${product?.category || "Stock"}`,
      },
    };
  });

  // Open OrderGenerator modal directly
  const handleGenerateOrder = () => {
    setIsOpen(false);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    clearCart();
    setAddedToCart([]);
  };

  const handleOpen = () => {
    setIsOpen(true);
    markAsRead();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getIcon = (type: "warning" | "alert" | "info") => {
    const badgeStyle = iconBadgeStyles[type];

    const IconComponent = () => {
      switch (type) {
        case "alert":
          return <CloudRain size={18} strokeWidth={2.5} color="white" />;
        case "warning":
          return <AlertTriangle size={18} strokeWidth={2.5} color="white" />;
        default:
          return <Lightbulb size={18} strokeWidth={2.5} color="white" />;
      }
    };

    return (
      <div
        style={{
          ...badgeStyle,
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        className="icon-badge"
      >
        <IconComponent />
      </div>
    );
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell size={20} className="text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Notifications"
        width="md"
      >
        <div
          style={{
            maxHeight: "65vh",
            overflowY: "auto",
            padding: "8px 4px",
          }}
        >
          {notifications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: "#6b7280",
              }}
            >
              <Bell size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontSize: "14px", fontWeight: 500 }}>
                Aucune notification
              </p>
              <p style={{ fontSize: "12px", marginTop: "4px", opacity: 0.7 }}>
                Vous êtes à jour !
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: "16px 18px",
                    borderRadius: "12px",
                    background: !notif.read
                      ? "linear-gradient(135deg, rgba(0, 199, 150, 0.08) 0%, rgba(0, 179, 134, 0.05) 100%)"
                      : "#fafafa",
                    border: !notif.read
                      ? "1px solid rgba(0, 199, 150, 0.2)"
                      : "1px solid var(--color-border, #e5e7eb)",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 20px rgba(0, 0, 0, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 8px rgba(0, 0, 0, 0.04)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>{getIcon(notif.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "8px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text-primary, #1b263b)",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {notif.title}
                        </h4>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#9ca3af",
                            background: "#f3f4f6",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            marginLeft: "12px",
                          }}
                        >
                          {notif.time}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--color-text-secondary, #475569)",
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        {notif.message}
                      </p>

                      {/* Action button for actionable notifications */}
                      {notif.actionable && (
                        <div style={{ marginTop: "12px" }}>
                          {addedToCart.includes(notif.id) ? (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                color: "var(--color-optimal, #228b5b)",
                                fontWeight: 600,
                                background: "rgba(34, 139, 91, 0.08)",
                                padding: "10px 14px",
                                borderRadius: "8px",
                              }}
                            >
                              <Check size={16} />✓ {notif.suggestedQuantity}{" "}
                              {notif.unit} ajoutés au panier
                            </div>
                          ) : processingId === notif.id ? (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                fontSize: "13px",
                                color: "var(--color-primary, #00c796)",
                                fontWeight: 600,
                                background: "rgba(0, 199, 150, 0.08)",
                                padding: "10px 14px",
                                borderRadius: "8px",
                              }}
                            >
                              <Loader2
                                size={16}
                                style={{ animation: "spin 1s linear infinite" }}
                              />
                              Ajout de {notif.suggestedQuantity} {notif.unit}...
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(notif);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "var(--color-primary, #00c796)",
                                background: "transparent",
                                border:
                                  "1.5px solid var(--color-primary, #00c796)",
                                padding: "10px 16px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "rgba(0, 199, 150, 0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "transparent";
                              }}
                            >
                              <ShoppingCart size={16} />
                              <span>
                                Commander {notif.suggestedQuantity} {notif.unit}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer avec boutons d'action */}
        <div
          style={{
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--color-border, #e5e7eb)",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Commander tout button */}
          <button
            onClick={handleAddAllToCart}
            disabled={isProcessing || actionableNotifications.length === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "white",
              background:
                isProcessing || actionableNotifications.length === 0
                  ? "#d1d5db"
                  : "linear-gradient(135deg, #00c796 0%, #00b386 100%)",
              border: "none",
              padding: "10px 20px",
              borderRadius: "var(--radius-md, 10px)",
              cursor:
                isProcessing || actionableNotifications.length === 0
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                isProcessing || actionableNotifications.length === 0
                  ? "none"
                  : "0 4px 12px rgba(0, 199, 150, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            {isProcessing ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                Traitement...
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Commander tout ({actionableNotifications.length})
              </>
            )}
          </button>

          {/* Générer la commande button - shows when cart has items */}
          {cartCount > 0 && (
            <button
              onClick={handleGenerateOrder}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                fontWeight: 600,
                color: "white",
                background: "linear-gradient(135deg, #1b263b 0%, #0f172a 100%)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "var(--radius-md, 10px)",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(27, 38, 59, 0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 16px rgba(27, 38, 59, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(27, 38, 59, 0.3)";
              }}
            >
              <ArrowRight size={16} />
              Générer la commande ({cartCount})
            </button>
          )}
        </div>
      </Modal>

      {/* Order Generator Modal */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={handleCloseOrderModal}
        title="Générateur de Commandes"
        width="lg"
      >
        <OrderGenerator
          recommendations={cartPredictions}
          onClose={handleCloseOrderModal}
        />
      </Modal>
    </>
  );
};

export default Notifications;
