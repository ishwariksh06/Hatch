"use client";

import { useState, useTransition } from "react";
import { formatINR } from "@/lib/format";
import { addToCart } from "@/app/actions/cart";

type Special = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isVeg: boolean;
  available: boolean;
};

function ChalkRow({ item }: { item: Special }) {
  const [added, setAdded] = useState(0);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-baseline gap-2 py-2">
      <span
        className="inline-grid place-items-center w-3 h-3 border shrink-0 translate-y-0.5"
        style={{ borderColor: item.isVeg ? "#7BBE8A" : "#E0897E" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: item.isVeg ? "#7BBE8A" : "#E0897E" }}
        />
      </span>
      <span className="font-display text-board-ink">{item.name}</span>
      <span className="flex-1 border-b border-dotted border-board-ink/30 translate-y-[-3px]" />
      <span className="font-display tabular text-board-ink">{formatINR(item.priceCents)}</span>
      <button
        onClick={() => {
          setAdded((n) => n + 1);
          start(async () => {
            await addToCart(item.id);
          });
        }}
        disabled={pending || !item.available}
        className="ml-1 h-7 px-3 rounded-[var(--radius-pill)] text-xs font-semibold bg-accent text-accent-ink transition-transform duration-150 active:scale-95 disabled:opacity-50"
      >
        {added > 0 ? `Added ×${added}` : "Add"}
      </button>
    </div>
  );
}

export function Chalkboard({ day, specials }: { day: string; specials: Special[] }) {
  if (specials.length === 0) return null;
  return (
    <div className="px-4 pt-5">
      <div className="board relative mx-auto max-w-md rounded-[var(--radius-card)] p-5 shadow-lg border-4 border-[#3a322c] -rotate-[0.6deg]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xl text-board-ink">Today&apos;s Specials</span>
          <span className="text-xs uppercase tracking-widest text-board-ink/60">{day}</span>
        </div>
        <div className="divide-y divide-board-ink/10">
          {specials.map((s) => (
            <ChalkRow key={s.id} item={s} />
          ))}
        </div>
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full"
          style={{ background: "var(--color-accent)", opacity: 0.85 }}
        />
      </div>
    </div>
  );
}
