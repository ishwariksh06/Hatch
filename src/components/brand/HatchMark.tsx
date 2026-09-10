/** Chunky HATCH wordmark. The "A" gets a little egg-yolk dot above it. */
export function HatchMark({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl sm:text-7xl",
  }[size];
  return (
    <span
      className={`font-display font-semibold tracking-[-0.02em] inline-flex items-start ${sizes} ${className}`}
    >
      HATCH
      <span
        aria-hidden
        className="ml-[0.12em] mt-[0.15em] inline-block rounded-full bg-accent"
        style={{ width: "0.28em", height: "0.28em" }}
      />
    </span>
  );
}
