"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiatePayment } from "@/lib/payment";

export type PayState = { error?: string };

export async function payOrder(_prev: PayState, formData: FormData): Promise<PayState> {
  const s = await requireUser();
  const publicId = String(formData.get("publicId") ?? "");
  const method = String(formData.get("method") ?? "upi");

  const order = await prisma.order.findUnique({ where: { publicId } });
  if (!order || order.userId !== s.userId) return { error: "Order not found" };
  if (order.paymentStatus === "paid") redirect(`/order/${publicId}`);

  const result = await initiatePayment({
    totalCents: order.totalCents,
    publicId: order.publicId,
    method,
  });

  if (result.status !== "paid") {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "failed" },
    });
    return { error: "Payment didn't go through. Try again or pay at the counter." };
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "paid", paymentTxnId: result.txnId },
    }),
    prisma.cartItem.deleteMany({ where: { cart: { userId: s.userId } } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/order/${publicId}`);
}

export async function payAtCounter(_prev: PayState, formData: FormData): Promise<PayState> {
  const s = await requireUser();
  const publicId = String(formData.get("publicId") ?? "");
  const order = await prisma.order.findUnique({ where: { publicId } });
  if (!order || order.userId !== s.userId) return { error: "Order not found" };

  await prisma.$transaction([
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "counter" } }),
    prisma.cartItem.deleteMany({ where: { cart: { userId: s.userId } } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/order/${publicId}`);
}
