import "server-only";
import { prisma } from "./prisma";
import { todayIndex } from "./day";

export async function getCuisines() {
  return prisma.category.findMany({
    where: { slug: { not: "specials" } },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function getTodaysSpecials() {
  const day = todayIndex();
  return prisma.foodItem.findMany({
    where: { isSpecial: true, specialDay: day },
    orderBy: { isVeg: "desc" },
  });
}

export async function getCuisineBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { items: { orderBy: [{ available: "desc" }, { isVeg: "desc" }, { name: "asc" }] } },
  });
}

/** Just the availability map, for the 10s client poll. */
export async function getAvailabilityMap(): Promise<Record<string, boolean>> {
  const items = await prisma.foodItem.findMany({ select: { id: true, available: true } });
  return Object.fromEntries(items.map((i) => [i.id, i.available]));
}
