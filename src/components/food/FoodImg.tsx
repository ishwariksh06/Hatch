"use client";

import { useState } from "react";
import { placeholderFor } from "@/lib/placeholder";

/** Food image that falls back to the deterministic SVG placeholder if the
 *  real URL fails to load (bad link, hotlink block, offline). */
export function FoodImg({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string | null;
  className?: string;
}) {
  const placeholder = placeholderFor(name);
  const [src, setSrc] = useState(imageUrl && imageUrl.trim() ? imageUrl : placeholder);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={className}
      loading="lazy"
      onError={() => src !== placeholder && setSrc(placeholder)}
    />
  );
}
