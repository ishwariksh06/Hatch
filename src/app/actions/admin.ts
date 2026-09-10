"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rupeesToPaise } from "@/lib/format";
import { adminNextStage } from "@/lib/status";
import type { Fulfilment } from "@/lib/status";

/* ---------- orders ---------- */

export async function advanceOrder(orderId: string) {
  await requireRole("admin");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false };
  const next = adminNextStage(order.status, order.fulfilment as Fulfilment);
  if (!next) return { ok: false };
  await prisma.order.update({ where: { id: orderId }, data: { status: next } });
  revalidatePath("/admin/orders");
  revalidatePath(`/order/${order.publicId}`);
  return { ok: true, status: next };
}

/* ---------- availability ---------- */

export async function setAvailability(foodItemId: string, available: boolean) {
  await requireRole("admin");
  await prisma.foodItem.update({ where: { id: foodItemId }, data: { available } });
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { ok: true };
}

/* ---------- food CRUD ---------- */

const foodSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is too short"),
  description: z.string().max(200).optional().or(z.literal("")),
  priceRupees: z.coerce.number().positive("Price must be greater than 0"),
  categoryId: z.string().min(1, "Pick a category"),
  isVeg: z.union([z.literal("on"), z.literal("")]).optional(),
  available: z.union([z.literal("on"), z.literal("")]).optional(),
  prepMinutes: z.coerce.number().int().min(1).max(120).default(10),
  imageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type FoodFormState = { error?: string; ok?: boolean };

export async function saveFoodItem(
  _prev: FoodFormState,
  formData: FormData,
): Promise<FoodFormState> {
  await requireRole("admin");
  const parsed = foodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const data = {
    name: d.name,
    description: d.description || null,
    priceCents: rupeesToPaise(d.priceRupees),
    categoryId: d.categoryId,
    isVeg: d.isVeg === "on",
    available: d.available === "on",
    prepMinutes: d.prepMinutes,
    imageUrl: d.imageUrl || null,
  };

  if (d.id) {
    await prisma.foodItem.update({ where: { id: d.id }, data });
  } else {
    await prisma.foodItem.create({ data });
  }
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { ok: true };
}

export async function deleteFoodItem(id: string) {
  await requireRole("admin");
  const used = await prisma.orderItem.count({ where: { foodItemId: id } });
  if (used > 0) {
    // keep order history intact — just hide it
    await prisma.foodItem.update({ where: { id }, data: { available: false } });
    await prisma.cartItem.deleteMany({ where: { foodItemId: id } });
    revalidatePath("/admin/menu");
    return { ok: true, softDeleted: true };
  }
  await prisma.cartItem.deleteMany({ where: { foodItemId: id } });
  await prisma.favourite.deleteMany({ where: { foodItemId: id } });
  await prisma.foodItem.delete({ where: { id } });
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { ok: true };
}

/* ---------- category CRUD ---------- */

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function saveCategory(_prev: FoodFormState, formData: FormData): Promise<FoodFormState> {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🍽️").trim() || "🍽️";
  const sortOrder = Number(formData.get("sortOrder") ?? 0) || 0;
  if (name.length < 2) return { error: "Category name is too short" };

  if (id) {
    await prisma.category.update({ where: { id }, data: { name, emoji, sortOrder } });
  } else {
    await prisma.category.create({
      data: { name, slug: slugify(name) || `cat-${Date.now()}`, emoji, sortOrder },
    });
  }
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  await requireRole("admin");
  const count = await prisma.foodItem.count({ where: { categoryId: id } });
  if (count > 0) return { ok: false, error: "Move or delete its dishes first" };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/menu");
  revalidatePath("/menu", "layout");
  return { ok: true };
}
