"use client";

import { useMemo, useState } from "react";
import { FoodCard, type FoodCardItem } from "@/components/food/FoodCard";
import { useAvailability } from "@/hooks/useAvailability";

type Item = FoodCardItem & { prepMinutes: number };

type Filter = "all" | "veg" | "nonveg";

export function CuisineList({
  items,
  favouriteIds,
  cartQty,
  availabilitySeed,
}: {
  items: Item[];
  favouriteIds: string[];
  cartQty: Record<string, number>;
  availabilitySeed: Record<string, boolean>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const availability = useAvailability(availabilitySeed);
  const favSet = useMemo(() => new Set(favouriteIds), [favouriteIds]);

  const shown = items.filter((i) =>
    filter === "all" ? true : filter === "veg" ? i.isVeg : !i.isVeg,
  );

  const TABS: { key: Filter; label: string }[] = [
    { key: "all", label: "Everything" },
    { key: "veg", label: "🟢 Veg" },
    { key: "nonveg", label: "🔴 Non-veg" },
  ];

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 px-4 py-2.5 bg-bg/85 backdrop-blur border-b border-line flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`h-8 px-3.5 rounded-[var(--radius-pill)] text-sm transition-all duration-150 border ${
              filter === t.key
                ? "bg-accent text-accent-ink border-[color:var(--color-accent)] font-medium"
                : "bg-surface text-muted border-line hover:bg-surface-2"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
        {shown.map((item) => (
          <FoodCard
            key={item.id}
            item={{ ...item, available: availability[item.id] ?? item.available }}
            favourited={favSet.has(item.id)}
            qty={cartQty[item.id] ?? 0}
          />
        ))}
      </div>
      {shown.length === 0 && (
        <p className="text-center text-sm text-muted py-12">Nothing here right now.</p>
      )}
    </>
  );
}
