"use client";

import { useState, useTransition } from "react";
import { Badge, Money } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { imageSrc } from "@/lib/placeholder";
import { addToCart, setQuantity, toggleFavourite } from "@/app/actions/cart";

export type FoodCardItem = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  available: boolean;
  isVeg: boolean;
  imageUrl: string | null;
};

function VegDot({ veg }: { veg: boolean }) {
  const c = veg ? "var(--color-success)" : "var(--color-danger)";
  return (
    <span
      className="inline-grid place-items-center w-3.5 h-3.5 border shrink-0"
      style={{ borderColor: c }}
      aria-label={veg ? "Veg" : "Non-veg"}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
    </span>
  );
}

export function FoodCard({
  item,
  favourited = false,
  qty = 0,
  onEdit,
}: {
  item: FoodCardItem;
  favourited?: boolean;
  qty?: number;
  onEdit?: () => void;
}) {
  const [count, setCount] = useState(qty);
  const [fav, setFav] = useState(favourited);
  const [pending, start] = useTransition();
  const [punch, setPunch] = useState(false);

  function add() {
    setCount((c) => c + 1);
    setPunch(true);
    setTimeout(() => setPunch(false), 180);
    start(async () => {
      await addToCart(item.id);
    });
  }
  function step(next: number) {
    const n = Math.max(0, next);
    setCount(n);
    start(async () => {
      await setQuantity(item.id, n);
    });
  }
  function fave() {
    setFav((f) => !f);
    start(async () => {
      await toggleFavourite(item.id);
    });
  }

  return (
    <div
      className={`group relative flex flex-col bg-surface border border-line rounded-[var(--radius-card)] overflow-hidden shadow-sm transition-all duration-150 ease-[var(--ease-out)] ${
        item.available ? "hover:shadow-lg hover:-translate-y-0.5" : "opacity-70"
      }`}
    >
      <div className="relative aspect-[4/3] bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc(item)}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <button
          onClick={fave}
          aria-pressed={fav}
          aria-label={fav ? "Remove from favourites" : "Add to favourites"}
          className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-bg/90 border border-line text-base transition-transform duration-150 active:scale-90"
        >
          <span className={fav ? "" : "grayscale opacity-50"}>{fav ? "❤️" : "🤍"}</span>
        </button>
        {!item.available && (
          <div className="absolute inset-0 grid place-items-center bg-board/35">
            <Badge tone="danger">Back soon</Badge>
          </div>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute top-2 left-2 w-8 h-8 grid place-items-center rounded-full bg-bg/90 border border-line text-sm"
            aria-label="Edit item"
          >
            ✏️
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-3.5 flex-1">
        <div className="flex items-start gap-2">
          <VegDot veg={item.isVeg} />
          <h3 className="font-display text-[15px] leading-snug flex-1">{item.name}</h3>
        </div>
        {item.description && (
          <p className="text-xs text-muted line-clamp-2">{item.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <Money paise={item.priceCents} className="text-lg" />
          {!item.available ? null : count === 0 ? (
            <button
              onClick={add}
              disabled={pending}
              className={buttonClass("primary", "sm", punch ? "scale-105" : "")}
            >
              Add
            </button>
          ) : (
            <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-[color:var(--color-accent)] bg-accent-soft overflow-hidden">
              <button
                onClick={() => step(count - 1)}
                className="w-8 h-8 grid place-items-center text-lg leading-none hover:bg-accent/20"
                aria-label="Decrease"
              >
                −
              </button>
              <span className="w-6 text-center tabular text-sm font-medium">{count}</span>
              <button
                onClick={() => step(count + 1)}
                className="w-8 h-8 grid place-items-center text-lg leading-none hover:bg-accent/20"
                aria-label="Increase"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
