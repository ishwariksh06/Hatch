"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatINR } from "@/lib/format";

const NAV = [
  { href: "/menu", label: "Menu", icon: "🍽️" },
  { href: "/orders", label: "Order history", icon: "🧾" },
  { href: "/favourites", label: "Favourites", icon: "❤️" },
  { href: "/cart", label: "Cart", icon: "🛒" },
];

export function AppShell({
  name,
  email,
  cartCount,
  cartSubtotalCents,
  children,
}: {
  name: string;
  email: string;
  cartCount: number;
  cartSubtotalCents: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const showBar = cartCount > 0 && pathname !== "/cart" && !pathname.startsWith("/checkout");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 h-14 px-3 flex items-center justify-between bg-bg/85 backdrop-blur border-b border-line">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-10 h-10 grid place-items-center rounded-full hover:bg-surface-2 transition-colors"
        >
          <span className="flex flex-col gap-[3px]" aria-hidden>
            <span className="w-1 h-1 rounded-full bg-ink" />
            <span className="w-1 h-1 rounded-full bg-ink" />
            <span className="w-1 h-1 rounded-full bg-ink" />
          </span>
        </button>
        <Link href="/menu" className="font-display text-lg tracking-tight">
          HATCH
        </Link>
        <Link
          href="/cart"
          aria-label={`Cart, ${cartCount} items`}
          className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-surface-2 transition-colors"
        >
          <span className="text-lg" aria-hidden>
            🛒
          </span>
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center text-[10px] font-semibold rounded-full bg-accent text-accent-ink tabular">
              {cartCount}
            </span>
          )}
        </Link>
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-board/40 animate-[fade_.15s_ease-out]"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-[280px] bg-bg border-r border-line shadow-lg p-5 flex flex-col gap-1 animate-[slidein_.18s_var(--ease-out)]">
            <div className="mb-4">
              <div className="font-display text-xl">Hi, {name.split(" ")[0]}</div>
              <div className="text-xs text-muted truncate">{email}</div>
            </div>
            {NAV.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 h-11 rounded-[var(--radius-input)] text-sm transition-colors ${
                    active ? "bg-accent-soft text-ink font-medium" : "hover:bg-surface-2 text-muted"
                  }`}
                >
                  <span aria-hidden>{n.icon}</span>
                  {n.label}
                </Link>
              );
            })}
            <form action={logoutAction} className="mt-auto">
              <button className="flex items-center gap-3 px-3 h-11 w-full rounded-[var(--radius-input)] text-sm text-[color:var(--color-danger)] hover:bg-danger-soft transition-colors">
                <span aria-hidden>↩︎</span> Sign out
              </button>
            </form>
          </nav>
        </div>
      )}

      <main className="flex-1 pb-24">{children}</main>

      {/* Sticky pay bar */}
      {showBar && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-3 animate-[slideup_.2s_var(--ease-out)]">
          <Link
            href="/cart"
            className="mx-auto max-w-md flex items-center justify-between gap-3 h-14 px-4 rounded-[var(--radius-card)] bg-accent text-accent-ink shadow-lg"
          >
            <span className="text-sm font-medium">
              {cartCount} {cartCount === 1 ? "item" : "items"} ·{" "}
              <span className="tabular">{formatINR(cartSubtotalCents)}</span>
            </span>
            <span className="text-sm font-semibold flex items-center gap-1">
              Proceed to pay <span aria-hidden>→</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
