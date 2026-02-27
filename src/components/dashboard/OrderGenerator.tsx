import React, { useState } from "react";
import Button from "../common/Button";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Truck,
  Package,
  Mail,
} from "lucide-react";
import {
  type Prediction,
  type Supplier,
  MOCK_SUPPLIERS,
  MOCK_PRODUCTS,
} from "../../utils/mockData";

interface OrderItem {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
}

interface SupplierOrder {
  supplier: Supplier | undefined;
  items: OrderItem[];
}

interface OrderGeneratorProps {
  recommendations: Prediction[];
  onClose: () => void;
}

const OrderGenerator: React.FC<OrderGeneratorProps> = ({
  recommendations,
  onClose,
}) => {
  const [step, setStep] = useState<"preview" | "sending" | "success">(
    "preview"
  );

  // Group recommendations by supplier
  const ordersBySupplier = recommendations.reduce<
    Record<string, SupplierOrder>
  >((acc, pred) => {
    if (pred.recommendation?.action !== "buy") return acc;

    const product = MOCK_PRODUCTS.find((p) => p.id === pred.productId);
    if (!product) return acc;

    const supplierId = product.supplierId;
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier: MOCK_SUPPLIERS.find((s) => s.id === supplierId),
        items: [],
      };
    }
    acc[supplierId].items.push({
      productName: product.name,
      quantity: pred.recommendation.quantity,
      unit: product.unit,
      price: product.pricePerUnit * pred.recommendation.quantity,
    });
    return acc;
  }, {});

  const handleSend = () => {
    setStep("sending");
    setTimeout(() => {
      setStep("success");
    }, 2000);
  };

  // Calculate grand total
  const grandTotal = Object.values(ordersBySupplier).reduce(
    (total, order) =>
      total + order.items.reduce((sum, item) => sum + item.price, 0),
    0
  );

  if (step === "success") {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 32px",
          animation: "fadeIn 0.4s ease-out",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            background:
              "linear-gradient(135deg, var(--color-primary, #00c796) 0%, #00b386 100%)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 12px 32px rgba(0, 199, 150, 0.3)",
          }}
        >
          <CheckCircle size={40} color="white" strokeWidth={2.5} />
        </div>
        <h3
          style={{
            fontSize: "24px",
            fontWeight: 700,
            marginBottom: "12px",
            color: "var(--color-text-primary, #1b263b)",
          }}
        >
          Commandes Envoyées ! 🎉
        </h3>
        <p
          style={{
            fontSize: "15px",
            color: "var(--color-text-secondary, #475569)",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          <strong>{Object.keys(ordersBySupplier).length}</strong> email(s) ont
          été envoyés à vos fournisseurs.
          <br />
          Vous recevrez les confirmations d'ici peu.
        </p>
        <Button onClick={onClose} size="lg" style={{ width: "100%" }}>
          Retour au Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header Summary */}
      <div
        style={{
          padding: "16px 24px",
          background:
            "linear-gradient(135deg, rgba(0, 199, 150, 0.08) 0%, rgba(0, 179, 134, 0.04) 100%)",
          borderBottom: "1px solid rgba(0, 199, 150, 0.15)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              background:
                "linear-gradient(135deg, var(--color-primary, #00c796) 0%, #00b386 100%)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0, 199, 150, 0.3)",
            }}
          >
            <Package size={20} color="white" />
          </div>
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: "15px",
                color: "var(--color-text-primary)",
              }}
            >
              {Object.keys(ordersBySupplier).length} fournisseur(s)
            </div>
            <div
              style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}
            >
              {Object.values(ordersBySupplier).reduce(
                (sum, o) => sum + o.items.length,
                0
              )}{" "}
              article(s) à commander
            </div>
          </div>
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary, #00c796) 0%, #00b386 100%)",
            color: "white",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "18px",
            boxShadow: "0 4px 12px rgba(0, 199, 150, 0.3)",
          }}
        >
          {grandTotal.toFixed(2)} €
        </div>
      </div>

      {/* List */}
      <div
        style={{
          padding: "20px",
          overflowY: "auto",
          maxHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "var(--color-bg, #f3f4f6)",
        }}
      >
        {Object.keys(ordersBySupplier).length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              color: "var(--color-text-secondary)",
            }}
          >
            <AlertCircle
              size={48}
              style={{ margin: "0 auto 16px", opacity: 0.4 }}
            />
            <p style={{ fontSize: "15px" }}>
              Aucune commande nécessaire pour le moment.
            </p>
          </div>
        ) : (
          Object.values(ordersBySupplier).map((order: SupplierOrder, idx) => (
            <div
              key={idx}
              style={{
                background: "white",
                borderRadius: "14px",
                padding: "20px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                border: "1px solid var(--color-border, #e5e7eb)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Supplier Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px dashed var(--color-border, #e5e7eb)",
                }}
              >
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background:
                        "linear-gradient(135deg, #1b263b 0%, #0f172a 100%)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(27, 38, 59, 0.2)",
                    }}
                  >
                    <Truck size={22} color="white" />
                  </div>
                  <div>
                    <h4
                      style={{
                        fontWeight: 600,
                        fontSize: "16px",
                        color: "var(--color-text-primary)",
                        margin: 0,
                      }}
                    >
                      {order.supplier?.name || "Fournisseur Inconnu"}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                        marginTop: "4px",
                      }}
                    >
                      <Mail size={12} />
                      {order.supplier?.email}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    background: "rgba(27, 38, 59, 0.08)",
                    color: "var(--color-text-primary)",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {order.items.length} article
                  {order.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Items */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {order.items.map((item: OrderItem, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--color-bg, #f3f4f6)",
                      borderRadius: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "var(--color-text-primary)" }}>
                      <strong>{item.quantity}</strong> {item.unit} ×{" "}
                      {item.productName}
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {item.price.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>

              {/* Supplier Total */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--color-border, #e5e7eb)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "var(--color-primary, #00c796)",
                  }}
                >
                  Total:{" "}
                  {order.items.reduce((sum, i) => sum + i.price, 0).toFixed(2)}{" "}
                  €
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "20px 24px",
          borderTop: "1px solid var(--color-border, #e5e7eb)",
          background: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSend}
          disabled={
            Object.keys(ordersBySupplier).length === 0 || step === "sending"
          }
          icon={step === "sending" ? undefined : <Send size={18} />}
          size="lg"
          style={{
            padding: "12px 28px",
            fontSize: "15px",
          }}
        >
          {step === "sending" ? "Envoi en cours..." : "Valider et Envoyer"}
        </Button>
      </div>
    </div>
  );
};

export default OrderGenerator;
