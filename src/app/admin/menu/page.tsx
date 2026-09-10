import { prisma } from "@/lib/prisma";
import { AdminMenu } from "@/components/admin/AdminMenu";

export default async function AdminMenuPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { name: "asc" } } },
  });

  return (
    <AdminMenu
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        sortOrder: c.sortOrder,
        items: c.items.map((i) => ({
          id: i.id,
          name: i.name,
          description: i.description,
          priceCents: i.priceCents,
          available: i.available,
          isVeg: i.isVeg,
          prepMinutes: i.prepMinutes,
          imageUrl: i.imageUrl,
          categoryId: i.categoryId,
          isSpecial: i.isSpecial,
        })),
      }))}
    />
  );
}
