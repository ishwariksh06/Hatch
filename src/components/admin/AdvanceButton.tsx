"use client";

import { useTransition } from "react";
import { advanceOrder } from "@/app/actions/admin";
import { nextStage } from "@/lib/status";
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
  const next = nextStage(status, fulfilment);

  if (!next) {
    return (
      <span className="inline-flex h-9 items-center px-3 text-sm text-[color:var(--color-success)] font-medium">
        ✓ Completed
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
