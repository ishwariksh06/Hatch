# HATCH — build progress

Competition build. Stack: Next.js 16 (App Router, Turbopack), Prisma + SQLite,
Tailwind v4 `@theme` tokens, `jose` cookie sessions + bcrypt. Three roles:
student, admin, runner.

Demo logins (seeded): `student@hatch.dev` / `admin@hatch.dev` / `runner@hatch.dev`,
password `hatch1234`.

Setup: `npm install && npm run setup && npm run dev`.

## Phase status

- **Phase 1 — scaffold + tokens + schema + seed — DONE.** HATCH token layer
  (yellow/black/brown/white, light-mode only, light font weights). Prisma schema
  with menu, cart, orders, favourites, campus locations, deliveries. Seed: 45 items
  across 4 cuisine sections + a 14-item weekly Chef's Specials schedule, 10 campus
  locations, 3 demo users.
- **Phase 2 — auth — DONE.** Register / login / logout, signed httpOnly cookie,
  `requireUser` / `requireRole` (both verify the session user still exists in DB),
  role-based home redirects, styled `/403`.
- **Phase 3 — student menu — DONE.** `/menu` floating chalkboard "Today's Specials"
  (today's veg + non-veg, add straight from the board), cuisine tiles with live
  dish counts → `/menu/[slug]` with veg / non-veg / everything filter. `FoodCard`
  with add → inline qty stepper, favourite heart, deterministic SVG placeholder,
  "Back soon" state for unavailable items. Live availability: client polls
  `/api/availability` every 10s and re-skins cards without a reload. App shell:
  3-dot drawer (profile, order history, favourites, cart, sign out), cart badge,
  sticky "Proceed to pay" bar.
  - *Stubbed:* `/cart`, `/orders`, `/favourites`, `/order/[publicId]` are
    placeholder screens until their phases.

- **Phase 4 — cart — DONE.** Qty steppers, remove, pickup vs delivery, campus
  drop-off + room + phone, live totals with delivery fee.
- **Phase 5 — checkout + payment + tracker — DONE.** `beginCheckout` creates the
  order (publicId + daily token). `/checkout` shows a styled UPI/Card panel behind
  the `initiatePayment()` interface — **mock provider today**, Razorpay test-mode is
  a drop-in of the same signature. Pay-at-counter fallback on failure.
  `/order/[publicId]`: chalkboard token ticket, animated `StatusStepper`, ETA from
  prep times, 10s auto-refresh while active.
- **Phase 6 — order history — DONE.** `/orders` newest-first, compact stepper,
  links to the live tracker. `/favourites` heart list.
- **Phases 7 & 8 — admin — DONE.** `/admin/menu` dish CRUD in a slide-over (price
  in ₹ → paise), prep time, veg + availability toggles, imageUrl, optimistic
  availability switch, category add/delete, styled `ConfirmDialog`. Delete keeps
  order history intact (soft-hide when referenced). `/admin/orders` all orders,
  active/oldest-first, forward-only Advance button, 10s auto-refresh.
- **Phase 9 — runner — DONE.** `/runner` batches all delivery orders the kitchen
  has marked *Ready*, computes the shortest kitchen→all-drops loop
  (nearest-neighbour + 2-opt, `lib/route.ts`), draws it on a schematic campus map,
  and gives per-stop Picked up / Delivered actions that push the student's tracker
  to *Out for delivery* / *Completed*.

## Known gaps / honest status

- **Payment is the mock provider.** Real Razorpay test keys are a documented
  drop-in, not wired yet.
- **"Live" = 10s polling**, not push/SSE (availability poll + `router.refresh`).
- Runner route AI is the classical optimiser only — no LLM narration layer yet.
- Not yet deployed to Vercel; SQLite needs swapping for Postgres (Neon) for a
  serverless deploy.
- Demo orders are seeded so admin/runner screens have content on first run.
