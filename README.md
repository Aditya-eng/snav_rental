# SNAV — DGPS / GNSS rental & sales website

Rent eSurvey GNSS receivers by the day, week or month (cheapest combination applied automatically), with delivery across Indian cities or office pickup, add-on operators/trainers, KYC, GST invoices, deposits and a full admin panel. Every instrument can also be enquired about for purchase.

## Run locally

```bash
npm install
cp .env.example .env        # then set AUTH_SECRET (see the file)
npx prisma db push          # creates prisma/dev.db (SQLite)
npx prisma db seed          # catalog, cities, services, FAQs, admin login (printed once)
npm run dev                 # http://localhost:3000  — admin at /admin
```

## What's where

| Area | Path |
| --- | --- |
| Public site, cart, checkout, account | `src/app/(site)` |
| Admin panel | `src/app/admin` |
| GST invoice & rental agreement (printable) | `src/app/documents` |
| Pricing engine (day/week/month optimiser) | `src/lib/pricing.ts` |
| Availability (stock per product per day) | `src/lib/availability.ts` |
| Quote / GST / coupons | `src/lib/quote.ts`, `src/lib/gst.ts` |
| Booking money, invoice numbers, payments | `src/lib/booking.ts` |
| Razorpay, email, file storage | `src/lib/razorpay.ts`, `src/lib/notify.ts`, `src/lib/storage.ts` |
| Database schema / seed data | `prisma/schema.prisma`, `prisma/seed.ts` |

Money is stored in paise. Rental dates are inclusive (5→7 Oct = 3 days).

## Before going live — checklist

1. **Admin → Products & pricing**: replace the placeholder rates, deposits and sale prices; upload product photos.
2. **Admin → Products → (product) → Units**: add your real serial numbers, then retire/delete the `DEMO-…` units.
3. **Admin → Cities & delivery**: set real delivery fees and your office address(es) for pickup.
4. **Admin → Services**: confirm operator/trainer day rates.
5. **Admin → Settings**: legal name, address, state, GSTIN, PAN, phone/WhatsApp, admin alert email, bank/UPI details, rental terms.
6. Have your CA confirm the SAC codes (rental `997319`, operator `998343`, training `999293`) and GST treatment, and a lawyer review the rental terms.
7. Change the admin password (My profile) and add staff under **Admin → Staff**.

## Deploying (Vercel + PostgreSQL)

1. In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`.
2. Create a Postgres database (Neon via the Vercel Marketplace, or Supabase) and set `DATABASE_URL`.
3. Create a Vercel Blob store (private) and connect it — this sets `BLOB_READ_WRITE_TOKEN`.
4. Set env vars from `.env.example`: `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL=https://snavindia.com`, `CRON_SECRET`, and optionally Razorpay + Resend keys.
5. Deploy, then run once against the production DB: `npx prisma db push && npx prisma db seed`.
6. Add `snavindia.com` (and `www`) to the Vercel project and point DNS at Vercel.
7. Razorpay → Webhooks: `https://snavindia.com/api/razorpay/webhook`, events `payment.captured` and `order.paid`, secret = `RAZORPAY_WEBHOOK_SECRET`.
8. Resend: verify the `snavindia.com` domain so emails come from `no-reply@snavindia.com`.

The daily cron (`vercel.json`) emails return reminders and an overdue summary.

### Without the optional services
- **No Razorpay keys** → bookings are placed as *requests*; staff confirm and record UPI/bank payments manually.
- **No Resend key** → emails are logged to the server console instead of sent.
- **No Blob token** → uploads are written to `./storage` (local development only).
