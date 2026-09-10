"use client";

import { useActionState, useState } from "react";
import { formatINR } from "@/lib/format";
import { inputClass } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { payOrder, payAtCounter, type PayState } from "@/app/actions/payment";

export function PaymentPanel({
  publicId,
  totalCents,
}: {
  publicId: string;
  totalCents: number;
}) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [state, formAction, pending] = useActionState<PayState, FormData>(payOrder, {});
  const [counterState, counterAction, counterPending] = useActionState<PayState, FormData>(
    payAtCounter,
    {},
  );

  return (
    <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
      <div className="flex gap-2 mb-4">
        {(["upi", "card"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`h-9 px-4 rounded-[var(--radius-pill)] text-sm border transition-all ${
              method === m
                ? "bg-accent text-accent-ink border-[color:var(--color-accent)] font-medium"
                : "bg-bg text-muted border-line"
            }`}
          >
            {m === "upi" ? "UPI" : "Card"}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="publicId" value={publicId} />
        <input type="hidden" name="method" value={method} />

        {method === "upi" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">UPI ID</span>
            <input className={inputClass} placeholder="yourname@upi" defaultValue="student@hatchpay" />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-sm font-medium">Card number</span>
              <input className={inputClass} placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Expiry</span>
              <input className={inputClass} placeholder="MM/YY" defaultValue="04/28" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">CVV</span>
              <input className={inputClass} placeholder="123" defaultValue="123" />
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || counterPending}
          className={buttonClass("primary", "lg", "w-full mt-1")}
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-accent-ink/30 border-t-accent-ink rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            `Pay ${formatINR(totalCents)}`
          )}
        </button>
      </form>

      {(state.error || counterState.error) && (
        <div className="mt-4 p-3 rounded-[var(--radius-input)] bg-danger-soft border border-[color:var(--color-danger)] text-sm">
          <p className="text-[color:var(--color-danger)]">{state.error || counterState.error}</p>
          <form action={counterAction} className="mt-2">
            <input type="hidden" name="publicId" value={publicId} />
            <button className={buttonClass("secondary", "sm")} disabled={counterPending}>
              {counterPending ? "One moment…" : "Pay at the counter instead"}
            </button>
          </form>
        </div>
      )}

      <p className="text-xs text-muted mt-4 text-center">
        Demo payment — no real money moves. Any details work.
      </p>
    </div>
  );
}
