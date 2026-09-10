"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createRazorpayOrder,
  mockCharge,
  razorpayKeyId,
  verifyRazorpaySignature,
} from "@/lib/payment";

export type PayState = { error?: string };

async function loadOrder(userId: string, publicId: string) {
  const order = await prisma.order.findUnique({ where: { publicId } });
  if (!order || order.userId !== userId) return null;
  return order;
}

async function settlePaid(orderId: string, userId: string, txnId: string) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: "paid", paymentTxnId: txnId },
    }),
    prisma.cartItem.deleteMany({ where: { cart: { userId } } }),
  ]);
  revalidatePath("/", "layout");
}

/* ---------- mock provider ---------- */

export async function payOrder(_prev: PayState, formData: FormData): Promise<PayState> {
  const s = await requireUser();
  const publicId = String(formData.get("publicId") ?? "");
  const order = await loadOrder(s.userId, publicId);
  if (!order) return { error: "Order not found" };
  if (order.paymentStatus === "paid") redirect(`/order/${publicId}`);

  const { txnId } = await mockCharge();
  await settlePaid(order.id, s.userId, txnId);
  redirect(`/order/${publicId}`);
}

/* ---------- razorpay provider ---------- */

export type RazorpayStart = {
  ok: boolean;
  error?: string;
  keyId?: string;
  razorpayOrderId?: string;
  amount?: number;
  publicId?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
};

export async function startRazorpayPayment(publicId: string): Promise<RazorpayStart> {
  const s = await requireUser();
  const order = await loadOrder(s.userId, publicId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.paymentStatus === "paid") return { ok: false, error: "Already paid" };

  const keyId = razorpayKeyId();
  if (!keyId) return { ok: false, error: "Razorpay is not configured" };

  let razorpayOrderId = order.paymentOrderId;
  if (!razorpayOrderId) {
    try {
      razorpayOrderId = await createRazorpayOrder(order.totalCents, order.publicId);
    } catch (e) {
      console.error("[razorpay] create order failed", e);
      const detail = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `Payment gateway error — ${detail}` };
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentOrderId: razorpayOrderId, paymentProvider: "razorpay" },
    });
  }

  return {
    ok: true,
    keyId,
    razorpayOrderId,
    amount: order.totalCents,
    publicId: order.publicId,
    prefillName: s.name,
    prefillEmail: s.email,
    prefillContact: order.contactPhone ?? "",
  };
}

export async function confirmRazorpayPayment(input: {
  publicId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<{ ok: boolean; error?: string }> {
  const s = await requireUser();
  const order = await loadOrder(s.userId, input.publicId);
  if (!order) return { ok: false, error: "Order not found" };
  if (order.paymentStatus === "paid") return { ok: true };

  if (order.paymentOrderId !== input.razorpayOrderId) {
    return { ok: false, error: "Payment order mismatch" };
  }
  const valid = verifyRazorpaySignature(
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.signature,
  );
  if (!valid) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "failed" },
    });
    return { ok: false, error: "Could not verify the payment" };
  }

  await settlePaid(order.id, s.userId, input.razorpayPaymentId);
  return { ok: true };
}

/* ---------- pay at counter ---------- */

export async function payAtCounter(_prev: PayState, formData: FormData): Promise<PayState> {
  const s = await requireUser();
  const publicId = String(formData.get("publicId") ?? "");
  const order = await loadOrder(s.userId, publicId);
  if (!order) return { error: "Order not found" };

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "counter" } }),
    prisma.cartItem.deleteMany({ where: { cart: { userId: s.userId } } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/order/${publicId}`);
}
