"use client";

import { useEffect, useState } from "react";

/**
 * Polls /api/availability every 10s and returns a live availability map.
 * Starts from the server-rendered seed so there's never a flash.
 */
export function useAvailability(seed: Record<string, boolean>) {
  const [map, setMap] = useState(seed);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch("/api/availability", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { availability: Record<string, boolean> };
        if (alive) setMap(data.availability);
      } catch {
        /* keep last known */
      }
    }
    const id = setInterval(tick, 10_000);
    tick();
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return map;
}
