import "server-only";
import { prisma } from "./prisma";

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

export type CartSummary = {
  items: Array<{
    id: string;
    foodItemId: string;
    name: string;
    priceCents: number;
    quantity: number;
    available: boolean;
    imageUrl: string | null;
    lineCents: number;
  }>;
  count: number;
  subtotalCents: number;
  hasUnavailable: boolean;
};

export async function getCartSummary(userId: string): Promise<CartSummary> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { foodItem: true }, orderBy: { id: "asc" } } },
  });

  const items = (cart?.items ?? []).map((ci) => ({
    id: ci.id,
    foodItemId: ci.foodItemId,
    name: ci.foodItem.name,
    priceCents: ci.foodItem.priceCents,
    quantity: ci.quantity,
    available: ci.foodItem.available,
    imageUrl: ci.foodItem.imageUrl,
    lineCents: ci.foodItem.priceCents * ci.quantity,
  }));

  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    subtotalCents: items.reduce((n, i) => n + i.lineCents, 0),
    hasUnavailable: items.some((i) => !i.available),
  };
}

export async function getFavouriteIds(userId: string): Promise<Set<string>> {
  const favs = await prisma.favourite.findMany({
    where: { userId },
    select: { foodItemId: true },
  });
  return new Set(favs.map((f) => f.foodItemId));
}
