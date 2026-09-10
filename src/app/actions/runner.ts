"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimiseRoute } from "@/lib/route";

export async function startRun() {
  const s = await requireRole("runner");

  const existing = await prisma.delivery.findFirst({
    where: { runnerId: s.userId, status: "active" },
  });
  if (existing) {
    revalidatePath("/runner");
    return { ok: true, deliveryId: existing.id };
  }

  const orders = await prisma.order.findMany({
    where: {
      fulfilment: "delivery",
      status: "Ready",
      stop: null,
      dropLocationId: { not: null },
    },
    include: { dropLocation: true },
  });
  if (orders.length === 0) return { ok: false, error: "No orders are ready for delivery yet" };

  const hub = (await prisma.campusLocation.findFirst({ where: { isHub: true } }))!;

  const ordered = optimiseRoute(
    { x: hub.x, y: hub.y },
    orders.map((o) => ({ id: o.id, x: o.dropLocation!.x, y: o.dropLocation!.y })),
  );

  const delivery = await prisma.delivery.create({ data: { runnerId: s.userId } });
  await prisma.$transaction([
    ...ordered.map((o, i) =>
      prisma.deliveryStop.create({
        data: { deliveryId: delivery.id, orderId: o.id, sequence: i },
      }),
    ),
    prisma.order.updateMany({
      where: { id: { in: ordered.map((o) => o.id) } },
      data: { status: "Out for delivery" },
    }),
  ]);

  for (const o of ordered) revalidatePath(`/order/${o.id}`);
  revalidatePath("/runner");
  revalidatePath("/admin/orders");
  return { ok: true, deliveryId: delivery.id };
}

export async function markPickedUp(stopId: string) {
  await requireRole("runner");
  await prisma.deliveryStop.update({ where: { id: stopId }, data: { pickedUpAt: new Date() } });
  revalidatePath("/runner");
  return { ok: true };
}

export async function markDelivered(stopId: string) {
  const s = await requireRole("runner");
  const stop = await prisma.deliveryStop.update({
    where: { id: stopId },
    data: { deliveredAt: new Date(), pickedUpAt: new Date() },
    include: { order: true, delivery: { include: { stops: true } } },
  });

  await prisma.order.update({ where: { id: stop.orderId }, data: { status: "Completed" } });

  const allDone = stop.delivery.stops.every((x) => x.id === stopId || x.deliveredAt);
  if (allDone) {
    await prisma.delivery.update({
      where: { id: stop.deliveryId },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  revalidatePath("/runner");
  revalidatePath(`/order/${stop.order.publicId}`);
  revalidatePath("/admin/orders");
  return { ok: true, allDone };
}
