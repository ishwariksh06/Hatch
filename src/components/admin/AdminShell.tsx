"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { HatchMark } from "@/components/brand/HatchMark";

const NAV = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HatchMark size="sm" />
            <span className="text-xs text-muted border border-line rounded-[var(--radius-pill)] px-2 py-0.5">
              Kitchen
            </span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`h-8 px-3 grid place-items-center rounded-[var(--radius-pill)] text-sm transition-colors ${
                    active ? "bg-accent text-accent-ink font-medium" : "text-muted hover:bg-surface-2"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
            <form action={logoutAction} className="ml-2">
              <button className="h-8 px-3 text-sm text-muted hover:text-[color:var(--color-danger)]">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-5">{children}</main>
    </div>
  );
}
