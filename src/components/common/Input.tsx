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
  return (
    <div className={clsx("input-wrapper", className)}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          className={clsx("input-field", {
            "has-icon": !!icon,
            "has-error": !!error,
          })}
          {...props}
        />
      </div>
      {error && <span className="input-error">{error}</span>}

      <style>{`
                .input-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                
                .input-label {
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    color: var(--color-text-secondary);
                }
                
                .input-container {
                    position: relative;
                }

                .input-field {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-base);
                    font-family: inherit;
                    color: var(--color-text-primary);
                    background-color: var(--color-surface);
                    transition: border-color 0.2s;
                }
                
                .input-field:focus {
                    outline: none;
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 2px rgba(33, 128, 141, 0.1);
                }

                .input-field.has-icon {
                    padding-left: 36px;
                }

                .input-icon {
                    position: absolute;
                    left: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--color-text-secondary);
                    display: flex;
                }
                
                .input-field.has-error {
                    border-color: var(--color-urgent);
                }
                
                .input-error {
                    font-size: 11px;
                    color: var(--color-urgent);
                }
            `}</style>
    </div>
  );
};

export default Input;
