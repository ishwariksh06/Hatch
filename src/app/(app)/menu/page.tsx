import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCuisines, getTodaysSpecials } from "@/lib/menu";
import { todayName } from "@/lib/day";
import { Chalkboard } from "@/components/menu/Chalkboard";

export default async function MenuHome() {
  await requireUser();
  const [cuisines, specials] = await Promise.all([getCuisines(), getTodaysSpecials()]);

  return (
    <div className="animate-[rise_.25s_ease-out]">
      <Chalkboard day={todayName()} specials={specials} />

      <section className="px-4 pt-7">
        <h1 className="font-display text-2xl mb-1">What are you feeling?</h1>
        <p className="text-sm text-muted mb-4">Pick a counter to see today&apos;s spread.</p>

        <div className="grid grid-cols-2 gap-3">
          {cuisines.map((c) => (
            <Link
              key={c.id}
              href={`/menu/${c.slug}`}
              className="group relative flex flex-col justify-between h-32 p-4 rounded-[var(--radius-card)] bg-surface border border-line shadow-sm overflow-hidden transition-all duration-150 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <span>
                <span className="block font-display text-[15px] leading-tight">{c.name}</span>
                <span className="text-xs text-muted">{c._count.items} dishes</span>
              </span>
              <span
                className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "var(--color-accent)", opacity: 0.08 }}
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
