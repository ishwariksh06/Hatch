export type Fulfilment = "pickup" | "delivery";

export const PICKUP_STAGES = ["Placed", "Preparing", "Ready", "Completed"] as const;
export const DELIVERY_STAGES = [
  "Placed",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Completed",
] as const;

export type OrderStatus =
  | (typeof PICKUP_STAGES)[number]
  | (typeof DELIVERY_STAGES)[number];

export function stagesFor(fulfilment: Fulfilment): readonly OrderStatus[] {
  return fulfilment === "delivery" ? DELIVERY_STAGES : PICKUP_STAGES;
}

export function stageIndex(status: string, fulfilment: Fulfilment): number {
  return Math.max(0, stagesFor(fulfilment).indexOf(status as OrderStatus));
}

/** Next forward stage, or null if already Completed. */
export function nextStage(status: string, fulfilment: Fulfilment): OrderStatus | null {
  const stages = stagesFor(fulfilment);
  const i = stages.indexOf(status as OrderStatus);
  if (i < 0 || i >= stages.length - 1) return null;
  return stages[i + 1];
}

export function isActive(status: string): boolean {
  return status !== "Completed";
}

/** 0..1 fill for the connector line. */
export function progress(status: string, fulfilment: Fulfilment): number {
  const stages = stagesFor(fulfilment);
  return stageIndex(status, fulfilment) / (stages.length - 1);
}

export const STATUS_TONE: Record<string, "accent" | "warn" | "success" | "muted"> = {
  Placed: "muted",
  Preparing: "warn",
  Ready: "accent",
  "Out for delivery": "accent",
  Completed: "success",
};
