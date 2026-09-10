"use client";

import { useEffect } from "react";
import { buttonClass } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Delete",
  danger = true,
  onConfirm,
  onCancel,
  pending,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-board/45 animate-[fade_.15s_ease-out]" onClick={onCancel} />
      <div className="relative bg-bg border border-line rounded-[var(--radius-card)] shadow-lg p-5 max-w-sm w-full animate-[rise_.18s_var(--ease-out)]">
        <h3 className="font-display text-lg">{title}</h3>
        <p className="text-sm text-muted mt-1.5">{body}</p>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onCancel} className={buttonClass("secondary", "sm")} disabled={pending}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={buttonClass(danger ? "danger" : "primary", "sm")}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
