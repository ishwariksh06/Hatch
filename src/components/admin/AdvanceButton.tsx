"use client";

import { useTransition } from "react";
import { advanceOrder } from "@/app/actions/admin";
import { adminNextStage } from "@/lib/status";
import type { Fulfilment } from "@/lib/status";
import { buttonClass } from "@/components/ui/Button";

export function AdvanceButton({
  orderId,
  status,
  fulfilment,
}: {
  orderId: string;
  status: string;
  fulfilment: Fulfilment;
}) {
  const [pending, start] = useTransition();
  const next = adminNextStage(status, fulfilment);

  if (!next) {
    if (status === "Completed") {
      return (
        <span className="inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-success)] font-medium">
          ✓ Completed
        </span>
      );
    }
    // delivery order at "Ready" — handed off to the runner
    return (
      <span className="inline-flex h-9 items-center px-3 text-sm text-muted">
        🛵 With the runner
      </span>
    );
  }

  return (
    <button
      onClick={() => start(async () => { await advanceOrder(orderId); })}
      disabled={pending}
      className={buttonClass("primary", "sm")}
    >
      {pending ? "…" : `Advance to ${next} →`}
    </button>
  );
}
