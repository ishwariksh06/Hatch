"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

export async function addToCart(foodItemId: string) {
  const s = await requireUser();
  const item = await prisma.foodItem.findUnique({ where: { id: foodItemId } });
  if (!item || !item.available) return { ok: false, error: "That item just went off the menu" };

  const cart = await getOrCreateCart(s.userId);
  await prisma.cartItem.upsert({
    where: { cartId_foodItemId: { cartId: cart.id, foodItemId } },
    create: { cartId: cart.id, foodItemId, quantity: 1 },
    update: { quantity: { increment: 1 } },
  });
  revalidatePath("/menu", "layout");
  revalidatePath("/cart");
  return { ok: true };
}

export async function setQuantity(foodItemId: string, quantity: number) {
  const s = await requireUser();
  const cart = await getOrCreateCart(s.userId);
  const q = Math.max(0, Math.min(20, Math.round(quantity)));
  if (q === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, foodItemId } });
  } else {
    await prisma.cartItem.upsert({
      where: { cartId_foodItemId: { cartId: cart.id, foodItemId } },
      create: { cartId: cart.id, foodItemId, quantity: q },
      update: { quantity: q },
    });
  }
  revalidatePath("/menu", "layout");
  revalidatePath("/cart");
  return { ok: true };
}

export async function removeFromCart(foodItemId: string) {
  return setQuantity(foodItemId, 0);
}

export async function toggleFavourite(foodItemId: string) {
  const s = await requireUser();
  const existing = await prisma.favourite.findUnique({
    where: { userId_foodItemId: { userId: s.userId, foodItemId } },
  });
  if (existing) {
    await prisma.favourite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favourite.create({ data: { userId: s.userId, foodItemId } });
  }
  revalidatePath("/menu", "layout");
  revalidatePath("/favourites");
  return { ok: true, favourited: !existing };
}
