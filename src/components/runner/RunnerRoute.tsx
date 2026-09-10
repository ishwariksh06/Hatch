"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { buttonClass } from "@/components/ui/Button";
import { RouteMap } from "./RouteMap";
import { markPickedUp, markDelivered } from "@/app/actions/runner";

export type RunnerStop = {
  id: string;
  sequence: number;
  pickedUp: boolean;
  delivered: boolean;
  locationName: string;
  x: number;
  y: number;
  student: string;
  phone: string | null;
  dropDetail: string | null;
  token: number;
  publicId: string;
  totalCents: number;
  items: { name: string; quantity: number }[];
};

export function RunnerRoute({
  hub,
  stops,
}: {
  hub: { x: number; y: number };
  stops: RunnerStop[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const nextIdx = stops.findIndex((s) => !s.delivered);

  return (
    <div className="flex flex-col gap-4">
      <RouteMap
        hub={hub}
        stops={stops.map((s) => ({
          x: s.x,
          y: s.y,
          label: s.locationName.split(" ")[0],
          done: s.delivered,
        }))}
      />

      <ol className="flex flex-col gap-3">
        {stops.map((s, i) => {
          const active = i === nextIdx;
          return (
            <li
              key={s.id}
              className={`rounded-[var(--radius-card)] border p-4 transition-all ${
                s.delivered
                  ? "border-line bg-surface-2 opacity-60"
                  : active
                    ? "border-[color:var(--color-accent)] bg-accent-soft"
                    : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 grid place-items-center rounded-full bg-accent text-accent-ink text-xs font-semibold">
                  {i + 1}
                </span>
                <span className="font-display">{s.locationName}</span>
                {s.delivered && <Badge tone="success">Delivered</Badge>}
              </div>
              <p className="text-sm mt-1">
                {s.student}
                {s.dropDetail ? ` · ${s.dropDetail}` : ""} · Token #{s.token}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {s.items.map((it) => `${it.name} ×${it.quantity}`).join(", ")} ·{" "}
                {formatINR(s.totalCents)}
              </p>
              {s.phone && (
                <a href={`tel:${s.phone}`} className="text-xs text-ink underline mt-0.5 inline-block">
                  📞 {s.phone}
                </a>
              )}

              {!s.delivered && (
                <div className="flex gap-2 mt-3">
                  {!s.pickedUp && (
                    <button
                      onClick={() => start(async () => { await markPickedUp(s.id); router.refresh(); })}
                      disabled={pending}
                      className={buttonClass("secondary", "sm")}
                    >
                      Picked up
                    </button>
                  )}
                  <button
                    onClick={() => start(async () => { await markDelivered(s.id); router.refresh(); })}
                    disabled={pending}
                    className={buttonClass("primary", "sm")}
                  >
                    Mark delivered
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
