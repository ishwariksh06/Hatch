import { formatINR } from "@/lib/format";

type Props = {
  subtotalCents: number;
  cgstCents: number;
  sgstCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  className?: string;
};

function Line({ label, value, muted = true }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

export function BillBreakdown({
  subtotalCents,
  cgstCents,
  sgstCents,
  deliveryFeeCents,
  totalCents,
  className = "",
}: Props) {
  return (
    <div className={`bg-surface border border-line rounded-[var(--radius-card)] p-4 ${className}`}>
      <Line label="Item total" value={formatINR(subtotalCents)} />
      <Line label="CGST 2.5%" value={formatINR(cgstCents)} />
      <Line label="SGST 2.5%" value={formatINR(sgstCents)} />
      {deliveryFeeCents > 0 && <Line label="Delivery" value={formatINR(deliveryFeeCents)} />}
      <div className="flex justify-between py-1 mt-1 pt-2 border-t border-dashed border-line font-medium">
        <span>To pay</span>
        <span className="tabular font-display text-base">{formatINR(totalCents)}</span>
      </div>
      <p className="text-[11px] text-muted mt-2">Prices inclusive of taxes · GSTIN 29ABCDE1234F1Z5</p>
    </div>
  );
}
