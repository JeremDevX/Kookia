import React, { useState, useEffect } from "react";
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
import { useCart } from "../../context/useCart";
import { useInventoryCatalog } from "../../features/inventory/useInventoryCatalog";
import { createOrderRecommendationsFromCartItems } from "../../features/orders/orderRecommendations";
import "./Notifications.css";

import { getNotifications, markNotificationsRead } from "../../services/notificationService";
import { iconBadgeStyles, type Notification } from "./notificationPresentation";

const Notifications: React.FC = () => {
  const { addToast } = useToast();
  const { products } = useInventoryCatalog();
  const {
    addToCart: addToGlobalCart,
    addMultipleToCart,
    cartCount,
    cartItems,
    refreshCart,
  } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const addedToCart = cartItems.map((item) => item.id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getNotifications().then((data) => { if (active) setNotifications(data); }, () => { if (active) addToast("info", "Notifications indisponibles", "Réessayez en rechargeant la page."); });
    return () => { active = false; };
  }, [addToast]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const actionableNotifications = notifications.filter(
    (n) => n.actionable && !addedToCart.includes(n.id)
  );
  const cartRecommendations = createOrderRecommendationsFromCartItems(
    cartItems,
    products
  );

  const markAsRead = async () => {
    try { setNotifications(await markNotificationsRead(notifications.map((item) => item.id))); }
    catch (error) { addToast("info", "Lecture non enregistrée", error instanceof Error ? error.message : "Réessayez."); }
  };

  // Add single item to cart
  const handleAddToCart = async (notif: Notification) => {
    if (!notif.productName || !notif.productId) return;


    // Add to global cart context
    const saved = await addToGlobalCart({
      id: notif.id,
      productId: notif.productId,
      productName: notif.productName,
      quantity: notif.suggestedQuantity || 0,
      unit: notif.unit || "kg",
      source: "notification",
    });

    if (saved) addToast(
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

    for (const notif of actionableNotifications) {
      if (notif.productId && notif.productName) itemsToAdd.push(notif);
    }

    // Add all to global cart
    const saved = await addMultipleToCart(
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
    if (saved) addToast(
      "success",
      "Commande prête !",
      `${actionableNotifications.length} article(s) ajouté(s). Cliquez sur "Générer la commande" pour continuer.`
    );
  };

  // Open OrderGenerator modal directly
  const handleGenerateOrder = () => {
    setIsOpen(false);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);

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
        className="icon-btn"
        aria-label={`Notifications, ${unreadCount} non lues`}
        aria-haspopup="dialog"
      >
        <Bell size={20} className="text-secondary" />
        {unreadCount > 0 && (
          <span className="notification-dot" aria-hidden="true"></span>
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
              <p style={{ fontSize: "1rem", fontWeight: 500 }}>
                Aucune notification
              </p>
              <p style={{ fontSize: "0.875rem", marginTop: "4px", opacity: 0.7 }}>
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
                  className="notification-item"
                  style={{
                    padding: "16px 18px",
                    borderRadius: "12px",
                    background: !notif.read
                      ? "linear-gradient(135deg, rgba(0, 199, 150, 0.08) 0%, rgba(0, 179, 134, 0.05) 100%)"
                      : "#fafafa",
                    border: !notif.read
                      ? "1px solid rgba(0, 199, 150, 0.2)"
                      : "1px solid var(--color-border, #e5e7eb)",
                    boxShadow: "none",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
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
                            fontSize: "1rem",
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
                            fontSize: "0.75rem",
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
                          fontSize: "0.9375rem",
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
                                fontSize: "0.9375rem",
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
                                fontSize: "0.9375rem",
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
                              className="notification-action-button"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                fontSize: "0.9375rem",
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
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "white",
              background:
                isProcessing || actionableNotifications.length === 0
                  ? "#d1d5db"
                  : "var(--color-primary)",
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
              className="notification-generate-button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "white",
                background: "var(--color-primary)",
                border: "none",
                padding: "10px 20px",
                borderRadius: "var(--radius-md, 10px)",
                cursor: "pointer",
                boxShadow: "none",
                transition: "all 0.2s ease",
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
          onValidated={() => { void refreshCart(); }}
          recommendations={cartRecommendations}
          onClose={handleCloseOrderModal}
        />
      </Modal>
    </>
  );
};

export default Notifications;
