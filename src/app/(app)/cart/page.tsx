import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCartSummary } from "@/lib/cart";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { CartView } from "@/components/cart/CartView";

export default async function CartPage() {
  const session = await requireUser();
  const [cart, locations, user] = await Promise.all([
    getCartSummary(session.userId),
    prisma.campusLocation.findMany({
      where: { isHub: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
  ]);

  if (cart.items.length === 0) {
    return (
      <div className="px-4 pt-6">
        <EmptyState
          title="Nothing in the cart yet"
          body="Pick something warm from the menu — it lands here."
          icon="🍚"
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
    <CartView
      items={cart.items.map((i) => ({
        foodItemId: i.foodItemId,
        name: i.name,
        priceCents: i.priceCents,
        quantity: i.quantity,
        available: i.available,
        imageUrl: i.imageUrl,
        lineCents: i.lineCents,
      }))}
      locations={locations}
      userPhone={user?.phone ?? null}
    />
  );
}
