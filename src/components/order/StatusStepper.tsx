import { stagesFor, stageIndex, type Fulfilment } from "@/lib/status";

const ICONS: Record<string, string> = {
  Placed: "🧾",
  Preparing: "🍳",
  Ready: "🔔",
  "Out for delivery": "🛵",
  Completed: "✅",
};

export function StatusStepper({
  status,
  fulfilment,
  compact = false,
}: {
  status: string;
  fulfilment: Fulfilment;
  compact?: boolean;
}) {
  const stages = stagesFor(fulfilment);
  const current = stageIndex(status, fulfilment);
  const fillPct = stages.length > 1 ? (current / (stages.length - 1)) * 100 : 0;

  return (
    <div className={compact ? "px-1" : "px-1 py-2"}>
      <div className="relative flex justify-between">
        {/* track */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-line rounded-full"
          style={{ marginInline: compact ? 10 : 16 }}
        />
        {/* fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-accent rounded-full transition-[width] duration-500 ease-[var(--ease-out)]"
          style={{
            left: compact ? 10 : 16,
            width: `calc((100% - ${compact ? 20 : 32}px) * ${fillPct / 100})`,
          }}
        />
        {stages.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          const size = compact ? "w-5 h-5 text-[10px]" : "w-8 h-8 text-sm";
          return (
            <div key={stage} className="relative z-10 flex flex-col items-center gap-1">
              <div
                className={`${size} grid place-items-center rounded-full border-2 transition-colors duration-300 ${
                  done || active
                    ? "bg-accent border-[color:var(--color-accent)] text-accent-ink"
                    : "bg-bg border-line text-muted"
                } ${active ? "animate-[pulsering_1.8s_ease-out_infinite]" : ""}`}
              >
                {compact ? (done || active ? "•" : "") : ICONS[stage]}
              </div>
              {!compact && (
                <span
                  className={`text-[11px] text-center leading-tight ${
                    active ? "text-ink font-medium" : "text-muted"
                  }`}
                >
                  {stage}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {compact && (
        <p className="text-xs text-muted mt-1.5">
          {status === "Completed" ? "Completed" : `Now: ${status}`}
        </p>
      )}
    </div>
  );
}
