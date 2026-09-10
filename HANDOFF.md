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

## Next

- Phase 4 — cart page (qty, remove, totals, delivery vs pickup choice)
- Phase 5 — checkout + Razorpay + order + live status tracker
- Phase 6 — order history
- Phase 7 — admin menu & category management
- Phase 8 — admin order management
- Phase 9 — runner interface + route optimiser
