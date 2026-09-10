import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

export function Stub({ title, who }: { title: string; who: string }) {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-5 h-14 border-b border-line">
        <span className="font-display text-lg">HATCH</span>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-4xl">🚧</div>
        <h1 className="font-display text-2xl">{title}</h1>
        <p className="text-muted text-sm max-w-xs">
          Signed in as {who}. This screen is being built in the next phase.
        </p>
      </div>
    </main>
  );
}
