import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCuisineBySlug } from "@/lib/menu";
import { getCartSummary, getFavouriteIds } from "@/lib/cart";
import { CuisineList } from "@/components/menu/CuisineList";

export default async function CuisinePage({ params }: PageProps<"/menu/[slug]">) {
  const session = await requireUser();
  const { slug } = await params;
  const cuisine = await getCuisineBySlug(slug);
  if (!cuisine || slug === "specials") notFound();

  const [favs, cart] = await Promise.all([
    getFavouriteIds(session.userId),
    getCartSummary(session.userId),
  ]);

  const cartQty: Record<string, number> = {};
  for (const it of cart.items) cartQty[it.foodItemId] = it.quantity;

  const items = cuisine.items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    priceCents: i.priceCents,
    available: i.available,
    isVeg: i.isVeg,
    imageUrl: i.imageUrl,
    prepMinutes: i.prepMinutes,
  }));
  const availabilitySeed = Object.fromEntries(items.map((i) => [i.id, i.available]));

  return (
    <div className="px-4 animate-[rise_.25s_ease-out]">
      <div className="pt-4 pb-1">
        <Link href="/menu" className="text-sm text-muted hover:text-ink">
          ← All counters
        </Link>
        <h1 className="font-display text-2xl mt-1 flex items-center gap-2">
          <span aria-hidden>{cuisine.emoji}</span> {cuisine.name}
        </h1>
      </div>
      <CuisineList
        items={items}
        favouriteIds={[...favs]}
        cartQty={cartQty}
        availabilitySeed={availabilitySeed}
      />
    </div>
  );
}
