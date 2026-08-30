import { useEffect } from "react";

/**
 * Reusable confirm-style modal - replaces native window.confirm() so the
 * dialog matches the app's own design language instead of the browser's
 * unstyled default. Deliberately minimal (overlay + title + message +
 * Cancel/Continue) rather than a full-featured dialog system, since
 * "Start fresh" on CV & Profile is the only caller today - built generic
 * enough (title/message/labels as props) to reuse for a future
 * confirmation without changes.
 *
 * Not a <dialog> element - plain div + overlay, styled to match the
 * app's existing flat/hairline-border/no-radius look (see .modal-* rules
 * in index.css) rather than relying on browser-default <dialog> chrome.
 */
export default function Modal({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirming = false,
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="modal-title" className="modal-title">
          {title}
        </div>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={confirming}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={confirming}>
            {confirming ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
