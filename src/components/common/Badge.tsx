import React from "react";
import type { ProductStatus } from "../../types";

interface BadgeProps {
  status: ProductStatus;
  label: string;
}

const Badge: React.FC<BadgeProps> = ({ status, label }) => {
  return (
    <span className={`badge badge-${status}`}>
      {status !== "neutral" && <span className={`dot ${status}`} />}
      {label}
    </span>
  );
};

export default Badge;
