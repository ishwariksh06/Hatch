import { prisma } from "@/lib/prisma";
import { formatINR, formatTime } from "@/lib/format";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { StatusStepper } from "@/components/order/StatusStepper";
import { AdvanceButton } from "@/components/admin/AdvanceButton";
import { AutoRefresh } from "@/components/AutoRefresh";
import type { Fulfilment } from "@/lib/status";

const PAY: Record<string, { text: string; tone: "success" | "warn" | "danger" | "muted" }> = {
  paid: { text: "Paid", tone: "success" },
  counter: { text: "At counter", tone: "warn" },
  failed: { text: "Failed", tone: "danger" },
  pending: { text: "Pending", tone: "muted" },
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: { items: true, user: { select: { name: true } }, dropLocation: true },
  });

  // pending / oldest-active first, then completed newest-first
  const sorted = [...orders].sort((a, b) => {
    const aActive = a.status !== "Completed";
    const bActive = b.status !== "Completed";
    if (aActive !== bActive) return aActive ? -1 : 1;
    return aActive
      ? a.placedAt.getTime() - b.placedAt.getTime()
      : b.placedAt.getTime() - a.placedAt.getTime();
  });

  const active = sorted.filter((o) => o.status !== "Completed").length;

  return (
    <div>
      <AutoRefresh seconds={10} />
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="font-display text-2xl">Orders</h1>
        <span className="text-sm text-muted">{active} active</span>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="No orders yet" body="New orders from students land here in real time." icon="🧾" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((o) => {
            const pay = PAY[o.paymentStatus] ?? PAY.pending;
            return (
              <div
                key={o.id}
                className="bg-surface border border-line rounded-[var(--radius-card)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-display">#{o.tokenNumber}</span>
                    <span className="text-sm text-muted">{o.publicId}</span>
                    <Badge tone={pay.tone}>{pay.text}</Badge>
                    <Badge tone="muted">
                      {o.fulfilment === "delivery" ? `🛵 ${o.dropLocation?.name ?? "Delivery"}` : "🥡 Pickup"}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted">{formatTime(o.placedAt)}</span>
                </div>

                <p className="text-sm mt-1">
                  <span className="text-muted">{o.user.name}</span> —{" "}
                  {o.items.map((i) => `${i.nameSnapshot} ×${i.quantity}`).join(", ")}
                </p>

                <div className="my-3 max-w-sm">
                  <StatusStepper status={o.status} fulfilment={o.fulfilment as Fulfilment} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-display tabular">{formatINR(o.totalCents)}</span>
                  <AdvanceButton
                    orderId={o.id}
                    status={o.status}
                    fulfilment={o.fulfilment as Fulfilment}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
