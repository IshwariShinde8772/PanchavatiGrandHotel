import { useEffect } from "react";

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-darkText/45 p-4" onClick={onClose}>
      <div
        className="section-card max-h-[calc(100vh-2rem)] w-full min-w-0 max-w-2xl overflow-hidden p-5 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 className="font-heading text-2xl">{title}</h3> : null}
        <div className="mt-4 max-h-[calc(100vh-8rem)] min-w-0 overflow-x-hidden overflow-y-auto pr-1 [overflow-wrap:anywhere]">
          {children}
        </div>
      </div>
    </div>
  );
}

