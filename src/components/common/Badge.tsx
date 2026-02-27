import React from "react";
import clsx from "clsx";
import type { ProductStatus } from "../../utils/mockData";
import "../../styles/index.css";

interface BadgeProps {
  status?: ProductStatus;
  label: string;
  color?: string; // Hex override
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, label, color, className }) => {
  // Determine class based on status if provided
  const statusClass = status ? `badge-${status}` : "";

  return (
    <span
      className={clsx("badge", statusClass, className)}
      style={
        color
          ? { backgroundColor: color + "20", color: color, borderColor: color }
          : {}
      }
    >
      {status === "urgent" && <span className="dot urgent"></span>}
      {status === "moderate" && <span className="dot moderate"></span>}
      {status === "optimal" && <span className="dot optimal"></span>}
      {label}
    </span>
  );
};

export default Badge;
