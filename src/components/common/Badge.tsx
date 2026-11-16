import React from "react";
import clsx from "clsx";
import type { ProductStatus } from "../../types";

interface BadgeProps {
  status?: ProductStatus;
  label: string;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ status, label, className }) => {
  // Determine class based on status if provided
  const statusClass = status ? `badge-${status}` : "";

  return (
    <span
      className={clsx("badge", statusClass, className)}
    >
      {status === "urgent" && <span className="dot urgent"></span>}
      {status === "moderate" && <span className="dot moderate"></span>}
      {status === "optimal" && <span className="dot optimal"></span>}
      {label}
    </span>
  );
};

export default Badge;
