import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:brightness-[0.97] shadow-sm border border-[color:var(--color-accent)]",
  secondary: "bg-surface text-ink border border-line hover:bg-surface-2",
  ghost: "bg-transparent text-ink hover:bg-surface-2 border border-transparent",
  danger:
    "bg-danger text-white hover:brightness-95 border border-[color:var(--color-danger)]",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[10px]",
  md: "h-10 px-4 text-sm rounded-[10px]",
  lg: "h-12 px-6 text-base rounded-[12px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-accent)] cursor-pointer";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
