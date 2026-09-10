import "server-only";
import crypto from "crypto";

/**
 * Payment provider layer. Two implementations, one shape:
 *  - "razorpay"  — real Razorpay test-mode Checkout (used when RAZORPAY_KEY_ID +
 *                  RAZORPAY_KEY_SECRET are set)
 *  - "mock"      — styled fake screen that always succeeds (fallback)
 * Callers pick behaviour off `paymentProvider()`, never off env vars directly.
 */

export type PaymentProvider = "mock" | "razorpay";

const KEY_ID = process.env.RAZORPAY_KEY_ID?.trim();
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim();

export function paymentProvider(): PaymentProvider {
  return KEY_ID && KEY_SECRET ? "razorpay" : "mock";
}

export function razorpayKeyId(): string | null {
  return KEY_ID ?? null;
}

/** Create a Razorpay order (amount in paise). Returns its id. */
export async function createRazorpayOrder(amountPaise: number, receipt: string): Promise<string> {
  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: Math.round(amountPaise), currency: "INR", receipt }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Verify the signature Razorpay Checkout hands back on success. */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** Mock provider — a short delay then success. */
export async function mockCharge(): Promise<{ txnId: string }> {
  await new Promise((r) => setTimeout(r, 1200));
  return { txnId: `MOCK-${Math.random().toString(36).slice(2, 8).toUpperCase()}` };
}
