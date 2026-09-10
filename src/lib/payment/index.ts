import "server-only";

export type PaymentResult = { status: "paid" | "failed"; txnId?: string };
export type PaymentInput = { totalCents: number; publicId: string; method?: string };

/**
 * Payment provider interface. Callers never branch on provider.
 * Today: mock provider (always succeeds after a short delay).
 * Drop-in later: a Razorpay implementation of the same signature — create a
 * Razorpay order server-side, open Checkout on the client, verify the signature
 * in a webhook, then return the same PaymentResult shape.
 */
export async function initiatePayment(input: PaymentInput): Promise<PaymentResult> {
  await new Promise((r) => setTimeout(r, 1400));
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return { status: "paid", txnId: `MOCK-${rand}` };
}

export const PAYMENT_PROVIDER = "mock" as const;
