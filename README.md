# HATCH — campus kitchen ordering + delivery

Order from the campus kitchen, pay in a tap, track it from the pan to your hands —
and, for big campuses, a runner app that plans the shortest delivery loop.

Built for a college competition. Next.js 16 (App Router, Turbopack) · Prisma +
SQLite · Tailwind v4 `@theme` tokens · `jose` cookie sessions + bcrypt.

## Run it

```bash
npm install
npm run setup      # prisma migrate + generate + seed
npm run dev
```

Open http://localhost:3000.

### Demo logins (password `hatch1234`)

| Role | Email | Lands on |
|---|---|---|
| Student | `student@hatch.dev` | `/menu` |
| Kitchen admin | `admin@hatch.dev` | `/admin/orders` |
| Runner | `runner@hatch.dev` | `/runner` |

## What's inside

**Student** — chalkboard "Today's Specials", cuisine → veg/non-veg browse, live
availability (10s poll), DB-persisted cart, pickup or campus delivery, styled
mock payment, animated 4/5-stage order tracker, order history, favourites.

**Kitchen admin** — dish & category CRUD (price in ₹, stored as paise), optimistic
availability toggle, all-orders board sorted active-first, forward-only status
advance.

**Runner** — delivery orders the kitchen marked *Ready* are batched, the shortest
kitchen → all-drops loop is computed (nearest-neighbour + 2-opt) and drawn on a
schematic campus map, per-stop pick-up / deliver actions drive the student tracker.

## Design

One system: warm white / kraft paper surfaces, near-black ink, marigold-yellow
accent, brown support. Light font weights, `Bricolage Grotesque` display +
`Inter` body. All colours, radii and shadows are `@theme` tokens in
`src/app/globals.css` — nothing hard-coded. Light mode only, by choice.

## Money

Always integer paise in the DB. `formatINR()` is the only formatter. No float math
on prices anywhere.

## Roadmap (not built yet)

- Real Razorpay test-mode payment (drop-in behind the existing `initiatePayment()`
  interface)
- SSE instead of 10s polling for truly live updates
- LLM narration layer over the runner route ("start at 12:40 when the biryani is
  ready, then Library…")
- Admin analytics dashboard
