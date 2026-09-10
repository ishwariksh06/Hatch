/**
 * Deterministic SVG placeholder for food items with no imageUrl.
 * Warm yellow/brown wash + the dish initial in display type. Never looks broken.
 * Returns a data URI usable directly in <img src> / next/image.
 */
const WASHES: [string, string][] = [
  ["#F4C430", "#6F4A2A"],
  ["#FCE9A8", "#B5761F"],
  ["#EFE0CC", "#6F4A2A"],
  ["#F8D57E", "#241F1B"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function placeholderFor(name: string): string {
  const h = hash(name);
  const [a, b] = WASHES[h % WASHES.length];
  const initial = (name.trim()[0] || "H").toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
  </linearGradient></defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <circle cx="330" cy="60" r="90" fill="#ffffff" opacity="0.08"/>
  <text x="200" y="185" font-family="Bricolage Grotesque, system-ui, sans-serif" font-size="150"
    font-weight="500" fill="#FFFDF6" opacity="0.9" text-anchor="middle">${initial}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function imageSrc(item: { name: string; imageUrl?: string | null }): string {
  return item.imageUrl && item.imageUrl.trim() ? item.imageUrl : placeholderFor(item.name);
}
