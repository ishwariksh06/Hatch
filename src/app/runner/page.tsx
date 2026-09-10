import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { AutoRefresh } from "@/components/AutoRefresh";
import { RunnerRoute } from "@/components/runner/RunnerRoute";
import { startRun } from "@/app/actions/runner";

export default async function RunnerPage() {
  const s = await requireRole("runner");

  const [delivery, readyCount, hub] = await Promise.all([
    prisma.delivery.findFirst({
      where: { runnerId: s.userId, status: "active" },
      include: {
        stops: {
          orderBy: { sequence: "asc" },
          include: {
            order: {
              include: {
                dropLocation: true,
                user: { select: { name: true } },
                items: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.count({
      where: {
        fulfilment: "delivery",
        status: { in: ["Ready", "Out for delivery"] },
        stop: null,
        dropLocationId: { not: null },
      },
    }),
    prisma.campusLocation.findFirst({ where: { isHub: true } }),
  ]);

  if (delivery) {
    return (
      <div className="animate-[rise_.25s_ease-out]">
        <AutoRefresh seconds={10} />
        <h1 className="font-display text-2xl mb-1">Your route</h1>
        <p className="text-sm text-muted mb-4">
          {delivery.stops.filter((x) => x.deliveredAt).length}/{delivery.stops.length} delivered ·
          shortest path from the kitchen
        </p>
        <RunnerRoute
          hub={{ x: hub!.x, y: hub!.y }}
          stops={delivery.stops.map((st) => ({
            id: st.id,
            sequence: st.sequence,
            pickedUp: !!st.pickedUpAt,
            delivered: !!st.deliveredAt,
            locationName: st.order.dropLocation?.name ?? "Campus",
            x: st.order.dropLocation?.x ?? 50,
            y: st.order.dropLocation?.y ?? 50,
            student: st.order.user.name,
            phone: st.order.contactPhone,
            dropDetail: st.order.dropDetail,
            token: st.order.tokenNumber,
            publicId: st.order.publicId,
            totalCents: st.order.totalCents,
            items: st.order.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity })),
          }))}
        />
      </div>
    );
  }

  return (
    <div className="animate-[rise_.25s_ease-out]">
      <AutoRefresh seconds={10} />
      {readyCount === 0 ? (
        <EmptyState
          title="No runs waiting"
          body="When the kitchen marks delivery orders ready, they show up here in an optimised batch."
          icon="🛵"
        />
      ) : (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🛵</div>
          <h1 className="font-display text-2xl">
            {readyCount} order{readyCount > 1 ? "s" : ""} ready to go
          </h1>
          <p className="text-sm text-muted mt-1 mb-5 max-w-xs mx-auto">
            HATCH plans the shortest loop from the kitchen through every drop-off.
          </p>
          <form
            action={async () => {
              "use server";
              await startRun();
            }}
          >
            <button className={buttonClass("primary", "lg")}>Start optimised run</button>
          </form>
        </div>
      )}
    </div>
  );
}
