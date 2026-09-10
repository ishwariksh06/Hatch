import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { PaymentPanel } from "@/components/checkout/PaymentPanel";

export default async function CheckoutPage({ params }: PageProps<"/checkout/[publicId]">) {
  const session = await requireUser();
  const { publicId } = await params;

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true, dropLocation: true },
  });
  if (!order || order.userId !== session.userId) notFound();
  if (order.paymentStatus === "paid" || order.paymentStatus === "counter") {
    redirect(`/order/${publicId}`);
  }

  return (
    <div className="px-4 pt-4 pb-8 max-w-md mx-auto animate-[rise_.25s_ease-out]">
      <h1 className="font-display text-2xl mb-1">Checkout</h1>
      <p className="text-sm text-muted mb-4">
        Order <span className="font-medium text-ink">{order.publicId}</span> ·{" "}
        {order.fulfilment === "delivery"
          ? `Deliver to ${order.dropLocation?.name ?? "campus"}`
          : "Pick up at the counter"}
      </p>

      <div className="bg-surface border border-line rounded-[var(--radius-card)] p-4 mb-4 text-sm">
        {order.items.map((it) => (
          <div key={it.id} className="flex justify-between py-1">
            <span className="text-muted">
              {it.nameSnapshot} <span className="tabular">×{it.quantity}</span>
            </span>
            <span className="tabular">{formatINR(it.priceCents * it.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between py-1">
          <span className="text-muted">Subtotal</span>
          <span className="tabular">{formatINR(order.subtotalCents)}</span>
        </div>
        {order.totalCents !== order.subtotalCents && (
          <div className="flex justify-between py-1">
            <span className="text-muted">Delivery</span>
            <span className="tabular">{formatINR(order.totalCents - order.subtotalCents)}</span>
          </div>
        )}
        <div className="flex justify-between py-1 mt-1 pt-2 border-t border-dashed border-line font-medium">
          <span>To pay</span>
          <span className="tabular font-display text-base">{formatINR(order.totalCents)}</span>
        </div>
      </div>

      <PaymentPanel publicId={order.publicId} totalCents={order.totalCents} />
    </div>
  );
}
