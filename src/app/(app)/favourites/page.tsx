import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartSummary } from "@/lib/cart";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { FoodCard } from "@/components/food/FoodCard";

export default async function FavouritesPage() {
  const session = await requireUser();
  const [favs, cart] = await Promise.all([
    prisma.favourite.findMany({
      where: { userId: session.userId },
      include: { foodItem: true },
      orderBy: { createdAt: "desc" },
    }),
    getCartSummary(session.userId),
  ]);

  const cartQty: Record<string, number> = {};
  for (const it of cart.items) cartQty[it.foodItemId] = it.quantity;

  if (favs.length === 0) {
    return (
      <div className="px-4 pt-6">
        <EmptyState
          title="No favourites yet"
          body="Tap the heart on any dish and it lands here for a quick reorder."
          icon="🤍"
          action={
            <Link href="/menu" className={buttonClass("primary", "md")}>
              Browse the menu
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 animate-[rise_.25s_ease-out]">
      <h1 className="font-display text-2xl mb-3">Favourites</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {favs.map((f) => (
          <FoodCard
            key={f.id}
            item={{
              id: f.foodItem.id,
              name: f.foodItem.name,
              description: f.foodItem.description,
              priceCents: f.foodItem.priceCents,
              available: f.foodItem.available,
              isVeg: f.foodItem.isVeg,
              imageUrl: f.foodItem.imageUrl,
            }}
            favourited
            qty={cartQty[f.foodItem.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
