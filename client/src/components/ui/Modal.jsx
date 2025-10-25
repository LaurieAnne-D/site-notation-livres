import { useEffect } from "react";

export default function Modal({ open, title, onClose, children, footer }) {
    useEffect(() => {
        function onEsc(e) { if (e.key === "Escape") onClose?.(); }
        if (open) window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="modal">
            <div className="modal__backdrop" onClick={onClose} />
            <div className="modal__panel" role="dialog" aria-modal="true">
                <div className="modal__head">
                    <div className="modal__title">{title}</div>
                    <button className="btn btn--ghost" onClick={onClose}>✕</button>
                </div>
                <div className="modal__body">{children}</div>
                {footer && <div className="modal__footer">{footer}</div>}
            </div>
        </div>
    );
}
