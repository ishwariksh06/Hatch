"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { Money, inputClass } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { FoodImg } from "@/components/food/FoodImg";
import { setQuantity } from "@/app/actions/cart";
import { beginCheckout, type CheckoutState } from "@/app/actions/checkout";
import { computeBill } from "@/lib/bill";

type Item = {
  foodItemId: string;
  name: string;
  priceCents: number;
  quantity: number;
  available: boolean;
  imageUrl: string | null;
  lineCents: number;
};


function Row({ item }: { item: Item }) {
  const [qty, setQty] = useState(item.quantity);
  const [, start] = useTransition();
  function step(n: number) {
    const v = Math.max(0, n);
    setQty(v);
    start(async () => {
      await setQuantity(item.foodItemId, v);
    });
  }
  return (
    <div
      className={`flex gap-3 py-3 ${qty === 0 ? "opacity-40" : ""} ${
        !item.available ? "opacity-60" : ""
      }`}
    >
      <FoodImg
        name={item.name}
        imageUrl={item.imageUrl}
        className="w-14 h-14 rounded-[10px] object-cover border border-line shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm leading-tight">{item.name}</div>
        <div className="text-xs text-muted">{formatINR(item.priceCents)} each</div>
        {!item.available && (
          <div className="text-xs text-[color:var(--color-danger)] mt-0.5">
            Sold out — remove to continue
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-3">
          <div className="inline-flex items-center rounded-[var(--radius-pill)] border border-line bg-surface overflow-hidden">
            <button onClick={() => step(qty - 1)} className="w-7 h-7 grid place-items-center text-base" aria-label="Decrease">−</button>
            <span className="w-6 text-center tabular text-sm">{qty}</span>
            <button onClick={() => step(qty + 1)} className="w-7 h-7 grid place-items-center text-base" aria-label="Increase">+</button>
          </div>
          <button
            onClick={() => step(0)}
            className="text-xs text-muted hover:text-[color:var(--color-danger)]"
          >
            Remove
          </button>
        </div>
      </div>
      <Money paise={item.priceCents * qty} className="text-sm shrink-0" />
    </div>
  );
}

export function CartView({
  items,
  locations,
  userPhone,
}: {
  items: Item[];
  locations: { id: string; name: string; kind: string }[];
  userPhone: string | null;
}) {
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(beginCheckout, {});

  const liveSubtotal = items.reduce((n, i) => n + i.priceCents * i.quantity, 0);
  const bill = computeBill(liveSubtotal, fulfilment);
  const hasUnavailable = items.some((i) => !i.available);

  return (
    <div className="px-4 pt-4 pb-4 max-w-md mx-auto animate-[rise_.25s_ease-out]">
      <h1 className="font-display text-2xl mb-3">Your cart</h1>

      <div className="bg-surface border border-line rounded-[var(--radius-card)] px-4 divide-y divide-line">
        {items.map((i) => (
          <Row key={i.foodItemId} item={i} />
        ))}
      </div>

      <form action={formAction} className="mt-5">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(["pickup", "delivery"] as const).map((f) => (
            <button
              type="button"
              key={f}
              onClick={() => setFulfilment(f)}
              className={`h-16 rounded-[var(--radius-card)] border text-sm flex flex-col items-center justify-center gap-0.5 transition-all ${
                fulfilment === f
                  ? "border-[color:var(--color-accent)] bg-accent-soft font-medium"
                  : "border-line bg-surface text-muted"
              }`}
            >
              <span className="text-lg" aria-hidden>{f === "pickup" ? "🥡" : "🛵"}</span>
              {f === "pickup" ? "Pick up at counter" : "Deliver to me"}
            </button>
          ))}
        </div>
        <input type="hidden" name="fulfilment" value={fulfilment} />

        {fulfilment === "delivery" && (
          <div className="flex flex-col gap-3 mb-3 animate-[rise_.2s_ease-out]">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Drop-off point</span>
              <select name="dropLocationId" className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choose a spot on campus
                </option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Room / desk (optional)</span>
              <input name="dropDetail" className={inputClass} placeholder="e.g. Room 214, 2nd floor" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Contact number</span>
              <input
                name="contactPhone"
                inputMode="numeric"
                defaultValue={userPhone ?? ""}
                className={inputClass}
                placeholder="10-digit mobile"
              />
            </label>
          </div>
        )}

        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-muted">Item total</span>
            <span className="tabular">{formatINR(bill.subtotalCents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">CGST 2.5%</span>
            <span className="tabular">{formatINR(bill.cgstCents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted">SGST 2.5%</span>
            <span className="tabular">{formatINR(bill.sgstCents)}</span>
          </div>
          {bill.deliveryFeeCents > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-muted">Delivery</span>
              <span className="tabular">{formatINR(bill.deliveryFeeCents)}</span>
            </div>
          )}
          <div className="flex justify-between py-1 mt-1 pt-2 border-t border-dashed border-line font-medium">
            <span>Total</span>
            <Money paise={bill.totalCents} className="text-base" />
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-[color:var(--color-danger)] mt-3">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending || hasUnavailable || liveSubtotal === 0}
          className={buttonClass("primary", "lg", "w-full mt-4")}
        >
          {pending ? "Setting up payment…" : `Proceed to pay · ${formatINR(bill.totalCents)}`}
        </button>
        <Link href="/menu" className="block text-center text-sm text-muted mt-3">
          Add more items
        </Link>
      </form>
    </div>
  );
}
