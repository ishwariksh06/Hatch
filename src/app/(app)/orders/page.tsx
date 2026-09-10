import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR, formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { StatusStepper } from "@/components/order/StatusStepper";
import type { Fulfilment } from "@/lib/status";

export default async function OrdersPage() {
  const session = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });

  if (orders.length === 0) {
    return (
      <div className="px-4 pt-6">
        <EmptyState
          title="No orders yet"
          body="Your past meals show up here — with a tap back to live tracking."
          icon="🧾"
          action={
            <Link href="/menu" className={buttonClass("primary", "md")}>
              Start an order
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 max-w-md mx-auto animate-[rise_.25s_ease-out]">
      <h1 className="font-display text-2xl mb-3">Order history</h1>
      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/order/${o.publicId}`}
            className="block bg-surface border border-line rounded-[var(--radius-card)] p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-sm">{o.publicId}</span>
              <span className="text-xs text-muted">{formatTime(o.placedAt)}</span>
            </div>
            <p className="text-xs text-muted mt-1 line-clamp-2">
              {o.items.map((i) => `${i.nameSnapshot} ×${i.quantity}`).join(" · ")}
            </p>
            <div className="mt-3">
              <StatusStepper
                status={o.status}
                fulfilment={o.fulfilment as Fulfilment}
                compact
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">
                {o.fulfilment === "delivery" ? "Delivery" : "Pickup"} · Token #{o.tokenNumber}
              </span>
              <span className="font-display tabular text-sm">{formatINR(o.totalCents)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
