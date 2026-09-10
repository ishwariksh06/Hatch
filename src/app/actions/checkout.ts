"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartSummary } from "@/lib/cart";
import { generatePublicId, nextTokenNumber } from "@/lib/order-id";

const schema = z.object({
  fulfilment: z.enum(["pickup", "delivery"]),
  dropLocationId: z.string().optional(),
  dropDetail: z.string().max(120).optional(),
  contactPhone: z.string().optional(),
});

export type CheckoutState = { error?: string };

export async function beginCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const s = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the delivery details" };
  const { fulfilment, dropLocationId, dropDetail, contactPhone } = parsed.data;

  if (fulfilment === "delivery") {
    if (!dropLocationId) return { error: "Pick a drop-off point" };
    if (!contactPhone || !/^\d{10}$/.test(contactPhone))
      return { error: "Enter a 10-digit contact number" };
  }

  const cart = await getCartSummary(s.userId);
  if (cart.items.length === 0) return { error: "Your cart is empty" };
  if (cart.hasUnavailable)
    return { error: "Remove the sold-out items before checking out" };

  const deliveryFeeCents = fulfilment === "delivery" ? 1500 : 0;
  const publicId = await generatePublicId();
  const tokenNumber = await nextTokenNumber();

  const order = await prisma.order.create({
    data: {
      publicId,
      tokenNumber,
      userId: s.userId,
      subtotalCents: cart.subtotalCents,
      totalCents: cart.subtotalCents + deliveryFeeCents,
      status: "Placed",
      paymentStatus: "pending",
      fulfilment,
      dropLocationId: fulfilment === "delivery" ? dropLocationId : null,
      dropDetail: fulfilment === "delivery" ? dropDetail || null : null,
      contactPhone: fulfilment === "delivery" ? contactPhone : s.email,
      items: {
        create: cart.items.map((i) => ({
          foodItemId: i.foodItemId,
          nameSnapshot: i.name,
          priceCents: i.priceCents,
          quantity: i.quantity,
        })),
      },
    },
  });

  redirect(`/checkout/${order.publicId}`);
}
