import React from "react";
import clsx from "clsx";
import "../../styles/index.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
  const inputId = props.id;
  const errorId = inputId && error ? `${inputId}-error` : undefined;
  return (
    <div className={clsx("input-wrapper", className)}>
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          className={clsx("input-field", {
            "has-icon": !!icon,
            "has-error": !!error,
          })}
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
      </div>
      {error && <span className="input-error" id={errorId}>{error}</span>}
    </div>
  );
};

export default Input;
