import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { BillBreakdown } from "@/components/BillBreakdown";
import { StatusStepper } from "@/components/order/StatusStepper";
import { AutoRefresh } from "@/components/AutoRefresh";
import type { Fulfilment } from "@/lib/status";

const PAYMENT_LABEL: Record<string, { text: string; tone: "success" | "warn" | "danger" | "muted" }> = {
  paid: { text: "Paid", tone: "success" },
  counter: { text: "Pay at counter", tone: "warn" },
  failed: { text: "Payment failed", tone: "danger" },
  pending: { text: "Payment pending", tone: "muted" },
};

export default async function OrderTrackerPage({ params }: PageProps<"/order/[publicId]"> ) {
  const session = await requireUser();
  const { publicId } = await params;

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      items: { include: { foodItem: { select: { prepMinutes: true } } } },
      dropLocation: true,
      stop: { include: { delivery: { include: { runner: { select: { name: true } } } } } },
    },
  });
  if (!order || order.userId !== session.userId) notFound();

  const maxPrep = Math.max(10, ...order.items.map((i) => i.foodItem.prepMinutes));
  const eta = new Date(order.placedAt.getTime() + maxPrep * 60_000);
  const pay = PAYMENT_LABEL[order.paymentStatus] ?? PAYMENT_LABEL.pending;
  const done = order.status === "Completed";

  return (
    <div className="px-4 pt-4 pb-8 max-w-md mx-auto animate-[rise_.25s_ease-out]">
      {!done && <AutoRefresh seconds={10} />}

      {/* Token ticket */}
      <div className="relative bg-board board rounded-[var(--radius-card)] p-5 text-center overflow-hidden">
        <p className="text-board-ink/60 text-xs uppercase tracking-widest">Show this at the counter</p>
        <p className="font-display text-5xl text-board-ink tabular mt-1">#{order.tokenNumber}</p>
        <p className="text-board-ink/70 text-sm mt-1">{order.publicId}</p>
        <div className="absolute -left-2 top-1/2 w-4 h-4 rounded-full bg-bg" />
        <div className="absolute -right-2 top-1/2 w-4 h-4 rounded-full bg-bg" />
      </div>

      <div className="mt-5 bg-surface border border-line rounded-[var(--radius-card)] p-4">
        <StatusStepper status={order.status} fulfilment={order.fulfilment as Fulfilment} />
        <p className="text-center text-sm text-muted mt-2">
          {done
            ? "All done. Enjoy!"
            : order.status === "Out for delivery" && order.stop?.delivery.runner
              ? `${order.stop.delivery.runner.name} is bringing it to ${order.dropLocation?.name ?? "you"}`
              : `Estimated ready around ${formatTime(eta).split(", ")[1] ?? formatTime(eta)}`}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Badge tone={pay.tone}>{pay.text}</Badge>
        <Badge tone="muted">
          {order.fulfilment === "delivery" ? `🛵 ${order.dropLocation?.name}` : "🥡 Counter pickup"}
        </Badge>
        <span className="text-xs text-muted">Placed {formatTime(order.placedAt)}</span>
      </div>

      <div className="mt-4 bg-surface border border-line rounded-[var(--radius-card)] p-4 text-sm">
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between py-1">
            <span className="text-muted">
              {it.nameSnapshot} <span className="tabular">×{it.quantity}</span>
            </span>
            <span className="tabular">{formatINR(it.priceCents * it.quantity)}</span>
          </div>
        ))}
      </div>

      <BillBreakdown
        subtotalCents={order.subtotalCents}
        cgstCents={Math.round(order.taxCents / 2)}
        sgstCents={order.taxCents - Math.round(order.taxCents / 2)}
        deliveryFeeCents={order.deliveryFeeCents}
        totalCents={order.totalCents}
        className="mt-3"
      />

      <Link href="/orders" className="block text-center text-sm text-muted mt-5">
        All my orders
      </Link>
    </div>
  );
}
