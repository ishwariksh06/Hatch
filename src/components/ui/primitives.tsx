import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`bg-surface border border-line rounded-[var(--radius-card)] shadow-sm ${className}`}
      {...props}
    />
  );
}

type Tone = "accent" | "warn" | "success" | "muted" | "danger" | "brown";
const TONES: Record<Tone, string> = {
  accent: "bg-accent-soft text-[color:var(--color-brown)] border-[color:var(--color-accent)]",
  warn: "bg-warn-soft text-[color:var(--color-warn)] border-[color:var(--color-warn)]",
  success: "bg-success-soft text-[color:var(--color-success)] border-[color:var(--color-success)]",
  muted: "bg-surface-2 text-muted border-line",
  danger: "bg-danger-soft text-[color:var(--color-danger)] border-[color:var(--color-danger)]",
  brown: "bg-brown-soft text-[color:var(--color-brown)] border-[color:var(--color-brown)]",
};

export function Badge({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-[var(--radius-pill)] border ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Money({ paise, className = "" }: { paise: number; className?: string }) {
  const rupees = Math.round(paise) / 100;
  return (
    <span className={`tabular font-display ${className}`}>
      ₹{rupees.toLocaleString("en-IN", { minimumFractionDigits: rupees % 1 === 0 ? 0 : 2 })}
    </span>
  );
}

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs text-[color:var(--color-danger)]">{error}</span>}
    </label>
  );
}

export const inputClass =
  "h-10 px-3 rounded-[var(--radius-input)] bg-bg border border-line text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[color:var(--color-accent)] transition-all duration-150";

export function EmptyState({
  title,
  body,
  action,
  icon = "🍽️",
}: {
  title: string;
  body: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <div className="text-4xl" aria-hidden>
        {icon}
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-muted text-sm max-w-xs">{body}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
