/**
 * The single source of truth for what an order costs.
 * Restaurant GST in India is 5% (CGST 2.5% + SGST 2.5%) on the food value.
 * All amounts are integer paise — no float math leaves this file.
 */
export const GST_RATE = 0.05;
export const DELIVERY_FEE_CENTS = 1500;

export type Bill = {
  subtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  cgstCents: number;
  sgstCents: number;
  totalCents: number;
};

export function computeBill(
  subtotalCents: number,
  fulfilment: "pickup" | "delivery",
): Bill {
  const deliveryFeeCents = fulfilment === "delivery" ? DELIVERY_FEE_CENTS : 0;
  const taxCents = Math.round(subtotalCents * GST_RATE);
  const cgstCents = Math.round(taxCents / 2);
  const sgstCents = taxCents - cgstCents;
  const totalCents = subtotalCents + deliveryFeeCents + taxCents;
  return { subtotalCents, deliveryFeeCents, taxCents, cgstCents, sgstCents, totalCents };
}
