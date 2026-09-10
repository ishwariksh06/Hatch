/**
 * Campus delivery route optimiser.
 *
 * The campus is a fixed set of known points on a 0..100 schematic grid, so we
 * solve the "start at the kitchen, visit every drop-off once" problem directly:
 * nearest-neighbour for a first tour, then 2-opt to remove crossings. For the
 * handful of stops one runner carries this is optimal in practice and runs in
 * well under a millisecond.
 */

export type Point = { x: number; y: number };
export type Stop<T> = T & Point;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function tourLength(hub: Point, ordered: Point[]): number {
  let total = 0;
  let prev = hub;
  for (const p of ordered) {
    total += dist(prev, p);
    prev = p;
  }
  return total;
}

function nearestNeighbour<T>(hub: Point, stops: Stop<T>[]): Stop<T>[] {
  const remaining = [...stops];
  const order: Stop<T>[] = [];
  let cur: Point = hub;
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((s, i) => {
      const d = dist(cur, s);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const [next] = remaining.splice(bi, 1);
    order.push(next);
    cur = next;
  }
  return order;
}

function twoOpt<T>(hub: Point, order: Stop<T>[]): Stop<T>[] {
  let best = order;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, k + 1).reverse(),
          ...best.slice(k + 1),
        ];
        if (tourLength(hub, candidate) + 1e-9 < tourLength(hub, best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

/** Returns the stops in the order the runner should visit them. */
export function optimiseRoute<T>(hub: Point, stops: Stop<T>[]): Stop<T>[] {
  if (stops.length <= 2) return stops;
  return twoOpt(hub, nearestNeighbour(hub, stops));
}
