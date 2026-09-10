import { requireRole } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { HatchMark } from "@/components/brand/HatchMark";

export default async function RunnerLayout({ children }: { children: React.ReactNode }) {
  const s = await requireRole("runner");
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-bg/90 backdrop-blur border-b border-line">
        <div className="flex items-center gap-2">
          <HatchMark size="sm" />
          <span className="text-xs text-muted border border-line rounded-[var(--radius-pill)] px-2 py-0.5">
            Runner
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{s.name}</span>
          <form action={logoutAction}>
            <button className="text-sm text-muted hover:text-[color:var(--color-danger)]">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5">{children}</main>
    </div>
  );
}
