"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Ancho máximo del panel (Tailwind), p. ej. `max-w-3xl`. */
  panelClassName?: string;
};

export function Modal({ open, onClose, title, children, panelClassName = "max-w-xl" }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Cerrar ventana"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 mb-0 max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-white/15 bg-surface-elevated p-5 shadow-xl sm:mb-0 sm:rounded-xl ${panelClassName}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <h2 id="modal-title" className="text-base font-semibold text-slate-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
