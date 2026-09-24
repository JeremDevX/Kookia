import React from "react";
import clsx from "clsx";
import "../../styles/index.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={clsx("btn", `btn-${variant}`, `btn-${size}`, className)}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export default Button;
