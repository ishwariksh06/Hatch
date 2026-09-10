# Deploying HATCH to Vercel

SQLite can't run on Vercel (read-only, ephemeral filesystem). Swap in a free
Neon Postgres. ~10 minutes.

## 1. Neon Postgres

1. https://neon.tech → sign in → **New project** (region close to you).
2. Copy the **pooled** connection string. It looks like:
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
3. Also copy the **direct** (non-pooled) URL — same host without `-pooler`.

## 2. Point Prisma at Postgres

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Local `.env`:

```
DATABASE_URL="<pooled Neon URL>"
DIRECT_URL="<direct Neon URL>"
SESSION_SECRET="<any 32+ random chars>"
```

Then, from your machine, create the schema on Neon and seed it once:

```bash
rm -rf prisma/migrations           # the SQLite migrations don't apply to PG
npx prisma migrate dev --name init # creates a fresh Postgres migration
npm run seed
git add -A && git commit -m "deploy: switch to Postgres" && git push
```

## 3. Vercel

1. https://vercel.com/new → import `ishwariksh06/Hatch`.
2. **Environment variables** (Production + Preview):
   - `DATABASE_URL` = pooled Neon URL
   - `DIRECT_URL` = direct Neon URL
   - `SESSION_SECRET` = same random string
3. **Build command**: `prisma generate && prisma migrate deploy && next build`
   (Settings → Build & Development Settings → override.)
4. Deploy.

The seed from step 2 already populated Neon, so the live site has the menu, demo
logins and demo orders on first load.

## 4. Razorpay (optional, later)

`initiatePayment()` in `src/lib/payment/index.ts` is the only thing to change —
implement the same `PaymentResult` signature with a Razorpay test-mode order +
Checkout + webhook signature check. Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
env vars. Callers don't change.
