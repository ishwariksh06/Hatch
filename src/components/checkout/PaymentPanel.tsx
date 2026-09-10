"use client";

import { useActionState, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";
import { inputClass } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import {
  payOrder,
  payAtCounter,
  startRazorpayPayment,
  confirmRazorpayPayment,
  type PayState,
} from "@/app/actions/payment";
import type { PaymentProvider } from "@/lib/payment";

/* eslint-disable  @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function CounterFallback({ publicId }: { publicId: string }) {
  const [state, action, pending] = useActionState<PayState, FormData>(payAtCounter, {});
  return (
    <form action={action} className="mt-2">
      <input type="hidden" name="publicId" value={publicId} />
      <button className={buttonClass("secondary", "sm")} disabled={pending}>
        {pending ? "One moment…" : "Pay at the counter instead"}
      </button>
      {state.error && <p className="text-xs text-[color:var(--color-danger)] mt-1">{state.error}</p>}
    </form>
  );
}

function RazorpayPay({ publicId, totalCents }: { publicId: string; totalCents: number }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    const init = await startRazorpayPayment(publicId);
    if (!init.ok || !window.Razorpay) {
      setError(init.error ?? "Payment could not start");
      setBusy(false);
      return;
    }
    const rzp = new window.Razorpay({
      key: init.keyId,
      order_id: init.razorpayOrderId,
      amount: init.amount,
      currency: "INR",
      name: "HATCH — campus kitchen",
      description: `Order ${publicId}`,
      prefill: {
        name: init.prefillName,
        email: init.prefillEmail,
        contact: init.prefillContact,
      },
      theme: { color: "#F4C430" },
      handler: async (resp: any) => {
        const res = await confirmRazorpayPayment({
          publicId,
          razorpayOrderId: resp.razorpay_order_id,
          razorpayPaymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        });
        if (res.ok) {
          router.push(`/order/${publicId}`);
          router.refresh();
        } else {
          setError(res.error ?? "Payment verification failed");
          setBusy(false);
        }
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on("payment.failed", (resp: any) => {
      setError(resp.error?.description ?? "Payment failed");
      setBusy(false);
    });
    rzp.open();
  }

  return (
    <div className="bg-surface border border-line rounded-[var(--radius-card)] p-5">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setReady(true)}
      />
      <p className="text-sm text-muted mb-4">
        Pay securely with UPI, cards, netbanking or wallets via Razorpay.
      </p>
      <button
        onClick={pay}
        disabled={!ready || busy}
        className={buttonClass("primary", "lg", "w-full")}
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-accent-ink/30 border-t-accent-ink rounded-full animate-spin" />
            Opening payment…
          </span>
        ) : (
          `Pay ${formatINR(totalCents)}`
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 rounded-[var(--radius-input)] bg-danger-soft border border-[color:var(--color-danger)] text-sm">
          <p className="text-[color:var(--color-danger)]">{error}</p>
          <CounterFallback publicId={publicId} />
        </div>
      )}

      <p className="text-xs text-muted mt-4 text-center">
        Razorpay test mode — use any test UPI / card. No real money moves.
      </p>
    </div>
  );
}

function MockPay({ publicId, totalCents }: { publicId: string; totalCents: number }) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [state, formAction, pending] = useActionState<PayState, FormData>(payOrder, {});

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

        {method === "upi" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">UPI ID</span>
            <input className={inputClass} placeholder="yourname@upi" defaultValue="student@hatchpay" />
          </label>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 col-span-2">
              <span className="text-sm font-medium">Card number</span>
              <input className={inputClass} defaultValue="4242 4242 4242 4242" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Expiry</span>
              <input className={inputClass} defaultValue="04/28" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">CVV</span>
              <input className={inputClass} defaultValue="123" />
            </label>
          </div>
        )}

        <button type="submit" disabled={pending} className={buttonClass("primary", "lg", "w-full mt-1")}>
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

      {state.error && (
        <div className="mt-4 p-3 rounded-[var(--radius-input)] bg-danger-soft border border-[color:var(--color-danger)] text-sm">
          <p className="text-[color:var(--color-danger)]">{state.error}</p>
          <CounterFallback publicId={publicId} />
        </div>
      )}

      <p className="text-xs text-muted mt-4 text-center">
        Demo payment — no real money moves. Any details work.
      </p>
    </div>
  );
}

export function PaymentPanel({
  publicId,
  totalCents,
  provider,
}: {
  publicId: string;
  totalCents: number;
  provider: PaymentProvider;
}) {
  return provider === "razorpay" ? (
    <RazorpayPay publicId={publicId} totalCents={totalCents} />
  ) : (
    <MockPay publicId={publicId} totalCents={totalCents} />
  );
}
