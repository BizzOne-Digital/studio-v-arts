# Studio V website and admin

Next.js 16, TypeScript, Tailwind v4, Motion, MongoDB Atlas. 12 public pages and a private admin portal at `/admin`.

Public pages: `/`, `/experiences`, `/schedule`, `/booking`, `/studio-rental`, `/pricing`, `/about`, `/team`, `/gallery`, `/testimonials`, `/faq`, `/contact` (with form).

## Install and run locally
```
npm install
copy .env.example .env.local     # set MONGODB_URI, SESSION_SECRET, ADMIN_SETUP_TOKEN
npm run db:seed                  # starter services, offers and FAQs (safe to re-run)
npm run db:admin -- you@example.com "a-strong-password"   # create or reset an admin
npm run dev                      # http://localhost:3000
```
`npm run db:seed:demo` adds demo sessions, prices and live bookings. Use it only on a scratch database (set `MONGODB_DB` to a different name).
`scripts/import-photos.ts` loads the supplied photos from output/studio-v-site-photos.

## First admin
1. Set `ADMIN_SETUP_TOKEN` (8+ chars) in the environment.
2. Open `/admin/setup`, enter the token, an email and a 12+ character password.
3. The setup page closes itself once an admin exists. Remove the token afterwards.

## Deploy
Set `MONGODB_URI` (Atlas), `MONGODB_DB` (default studio_v), `SESSION_SECRET` (32+ chars), `NEXT_PUBLIC_SITE_URL`, then `npm run db:seed`, `npm run build`, `npm start`. Works on Vercel or any Node host. In Atlas, allow the host's IP in Network Access.
Optional email: `RESEND_API_KEY`, `EMAIL_FROM`, `STUDIO_NOTIFY_EMAIL`. Without them bookings still save, nothing is emailed, and admin and customers are told so.

## How booking stays safe
- All booking writes run in a MongoDB transaction that first updates one shared lock document, so concurrent requests are serialised. Classes and rentals share one conflict-aware schedule (with setup/cleanup buffers) and capacity cannot be exceeded.
- Prices are calculated on the server. Offers never stack (cheapest eligible wins) and never go below the minimum hourly rate. A promo slot is held by each pending/confirmed/completed rental booking record; declined/cancelled release it.
- New bookings are always pending. Payment status is separate; no online payment exists.
- Live bookings cannot be switched on until terms, cancellation, tax review, a rental price and rental hours are set.

Run `npm run test:engine` (after `npm run db:seed:demo`, on a scratch DB. It deletes all bookings!) for the booking-engine checks.

## Missing launch content (owner to supply)
Address (and tick "verified"), business hours, social URLs, logo file, real studio photos, team profiles, real testimonials, booking terms, cancellation terms, tax decision, confirmed regular rental rate, class prices and sessions, max people per rental (default 12 is a placeholder), email provider keys, off-peak definition, confirmation of the five draft programs. No shop/products exist, so admin has no products module.

## Production checklist
1. Environment (Vercel project settings or host env): `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET` (random, 32+ chars), `NEXT_PUBLIC_SITE_URL` (the real https domain, used for sitemap and social previews). Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `STUDIO_NOTIFY_EMAIL`.
2. Atlas: allow the host in Network Access (Vercel needs `0.0.0.0/0` unless you use their static IPs). Keep the Atlas region close to the host region.
3. First run: `npm run db:seed`, then `npm run db:admin -- you@example.com "strong-password"`. Leave `ADMIN_SETUP_TOKEN` empty afterwards.
4. Admin images upload to MongoDB (`stored_uploads`), are resized to WebP and served from `/api/uploads/...`. Vercel limits request bodies to 4.5 MB.
5. Public pages are cached and expire instantly when the admin saves. Use `npm run build` and `npm start` (dev mode is slower and not cached).
6. Before turning live bookings on: booking terms, cancellation terms, tax review, a rental price and rental hours (Admin, Website settings).
