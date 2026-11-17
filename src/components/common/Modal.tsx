import React, { useId, useRef } from "react";
import { X } from "lucide-react";
import { useDialogFocus } from "./useDialogFocus";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  title: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  closeDisabled = false,
  title,
  children,
  width = "md",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogFocus(modalRef, isOpen, onClose, closeDisabled);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={closeDisabled ? undefined : onClose}>
      <div
        className={`modal-container modal-${width} animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal-header">
          <h3 id={titleId} className="modal-title">
            {title}
          </h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={closeDisabled}
            type="button"
            aria-label="Fermer la modale"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
