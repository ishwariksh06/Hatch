/** Cute line-art food doodles, scattered as decoration. Pointer-events off. */

const stroke = { stroke: "currentColor", strokeWidth: 5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Boba() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M16 18h28l-4 34a6 6 0 0 1-6 5H26a6 6 0 0 1-6-5Z" {...stroke} />
      <path d="M12 18h36" {...stroke} />
      <path d="M30 8v10" {...stroke} />
      <circle cx="25" cy="46" r="3" fill="currentColor" />
      <circle cx="34" cy="49" r="3" fill="currentColor" />
      <circle cx="29" cy="40" r="3" fill="currentColor" />
    </svg>
  );
}
function Burger() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M10 22c0-9 9-14 20-14s20 5 20 14Z" {...stroke} />
      <path d="M10 30h40" {...stroke} />
      <path d="M12 38h36" {...stroke} />
      <path d="M12 38c0 8 6 12 18 12s18-4 18-12" {...stroke} />
    </svg>
  );
}
function Chili() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M20 12c2 6 0 10 4 12" {...stroke} />
      <path d="M24 24c14 0 22 10 22 22 0 0-10-2-18-8s-12-14-4-14Z" {...stroke} />
    </svg>
  );
}
function Coffee() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M14 22h28v14a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12Z" {...stroke} />
      <path d="M42 26h6a6 6 0 0 1 0 12h-6" {...stroke} />
      <path d="M22 10c-2 4 2 6 0 10M32 10c-2 4 2 6 0 10" {...stroke} />
    </svg>
  );
}
function Noodles() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M12 30h36l-4 16a6 6 0 0 1-6 5H22a6 6 0 0 1-6-5Z" {...stroke} />
      <path d="M16 30c0-12 28-12 28 0" {...stroke} />
      <path d="M40 12c6 2 6 10 0 12M46 26l6-4" {...stroke} />
    </svg>
  );
}
function Dosa() {
  return (
    <svg viewBox="0 0 60 60" className="w-full h-full">
      <path d="M8 42c14-4 30-4 44 0-6 6-38 6-44 0Z" {...stroke} />
      <path d="M18 38c4-14 12-22 20-24" {...stroke} />
      <circle cx="44" cy="44" r="4" fill="currentColor" />
    </svg>
  );
}

const ITEMS = [Boba, Burger, Chili, Coffee, Noodles, Dosa];

type Spot = { top?: string; left?: string; right?: string; bottom?: string; rotate: number; size: number };

export function FoodDoodles({ spots, className = "" }: { spots: Spot[]; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden text-brown/25 ${className}`} aria-hidden>
      {spots.map((s, i) => {
        const Doodle = ITEMS[i % ITEMS.length];
        return (
          <span
            key={i}
            className="absolute"
            style={{
              top: s.top,
              left: s.left,
              right: s.right,
              bottom: s.bottom,
              width: s.size,
              height: s.size,
              transform: `rotate(${s.rotate}deg)`,
            }}
          >
            <Doodle />
          </span>
        );
      })}
    </div>
  );
}
