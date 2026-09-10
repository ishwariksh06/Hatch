import type { ReactNode } from "react";

export function AuthShell({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh grid md:grid-cols-2">
      {/* Brand / chalkboard panel */}
      <section className="board relative hidden md:flex flex-col justify-between p-10 overflow-hidden">
        <div className="font-display text-2xl tracking-tight">HATCH</div>
        <div className="space-y-4">
          <p className="font-display text-4xl leading-tight">
            The campus kitchen,
            <br />
            in your pocket.
          </p>
          <p className="text-board-ink/70 max-w-sm text-sm leading-relaxed">
            Browse today&apos;s menu, pay in a tap, and track your order from the pan to
            your hands. No queue, no shouting your name over the counter.
          </p>
        </div>
        <div className="text-board-ink/50 text-xs">Made for the campus · fresh daily</div>
        <div
          className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full"
          style={{ background: "var(--color-accent)", opacity: 0.14 }}
        />
      </section>

      {/* Form panel */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="md:hidden font-display text-2xl mb-8">HATCH</div>
          <h1 className="font-display text-3xl mb-1">{heading}</h1>
          <p className="text-muted text-sm mb-8">Welcome to the counter.</p>
          {children}
        </div>
      </section>
    </main>
  );
}
