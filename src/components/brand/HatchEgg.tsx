/**
 * The HATCH mascot — a cracked egg with a sunny-side-up yolk hatching out of it
 * like a little rising sun. "Hatch", in food terms.
 */
export function HatchEgg({ className = "", size = 160 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      role="img"
      aria-label="A cracked egg hatching a sunny-side-up yolk"
    >
      {/* rays */}
      <g stroke="#F4C430" strokeWidth="7" strokeLinecap="round">
        <line x1="100" y1="14" x2="100" y2="30" />
        <line x1="60" y1="24" x2="68" y2="39" />
        <line x1="140" y1="24" x2="132" y2="39" />
        <line x1="34" y1="54" x2="49" y2="63" />
        <line x1="166" y1="54" x2="151" y2="63" />
      </g>

      {/* egg white blob under the yolk */}
      <path
        d="M56 118c-14-6-24 6-20 20 3 11-6 15-6 24 0 16 32 22 70 22s70-6 70-22c0-9-9-13-6-24 4-14-6-26-20-20-8 3-13-2-18-8-9-11-19-11-26 0-5 6-10 11-18 8Z"
        fill="#FFFFFF"
        stroke="#E8D9BB"
        strokeWidth="4"
      />

      {/* yolk */}
      <circle cx="100" cy="104" r="40" fill="#F4C430" />
      <circle cx="100" cy="104" r="40" fill="url(#yolkShade)" />
      {/* shine */}
      <ellipse cx="84" cy="88" rx="12" ry="8" fill="#FFFFFF" opacity="0.55" />
      {/* cheeks */}
      <circle cx="78" cy="112" r="6" fill="#FF8A5B" opacity="0.55" />
      <circle cx="122" cy="112" r="6" fill="#FF8A5B" opacity="0.55" />
      {/* face */}
      <g fill="#1A1512">
        <circle cx="88" cy="102" r="4.5" />
        <circle cx="112" cy="102" r="4.5" />
      </g>
      <path
        d="M90 116c3 5 17 5 20 0"
        stroke="#1A1512"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* cracked shell — bottom cup */}
      <path
        d="M50 150c0 22 22 34 50 34s50-12 50-34c0-6-3-11-3-11l-8 8-9-10-10 11-10-12-10 12-10-11-9 10-8-8s-3 5-3 11Z"
        fill="#FFFDF6"
        stroke="#E8D9BB"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M70 168c6 4 14 6 22 6" stroke="#E8D9BB" strokeWidth="4" strokeLinecap="round" />

      <defs>
        <radialGradient id="yolkShade" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0.55" stopColor="#F4C430" stopOpacity="0" />
          <stop offset="1" stopColor="#D89A1E" stopOpacity="0.6" />
        </radialGradient>
      </defs>
    </svg>
  );
}
