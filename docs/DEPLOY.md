# Deploying Vitrina

## Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `HF_API_BASE_URL` | yes | Origin of the generation platform API |
| `APP_SECRET` | yes | `openssl rand -base64 32`; signs sessions, seals BYOK keys |
| `APP_URL` | yes | Public origin; checkout redirects and local file URLs |
| `PLATFORM_API_KEY` | SaaS mode | Your platform key `id:secret`; leave empty to force BYOK |
| `DATABASE_URL` | no | `file:./data/vitrina.db` (default) or a libsql/Turso URL |
| `DATABASE_AUTH_TOKEN` | Turso | |
| `STORAGE_DRIVER`, `NEXT_PUBLIC_STORAGE_DRIVER` | no | `local` (default) or `blob`; set both the same |
| `BLOB_READ_WRITE_TOKEN` | blob | Vercel Blob token |
| `DATA_DIR` | local | Where the DB file and uploads live |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | billing | |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_STUDIO` | billing | Recurring monthly prices |
| `RESEND_API_KEY`, `MAIL_FROM` | mail | Enables password reset by email; absent, the link is hidden |
| `SIGNUPS` | no | `closed` refuses new accounts on a private install |

Migrations run automatically when the server boots. `pnpm start` serves the
standalone build (the same artifact the Dockerfile ships).

## Docker (single host)

```bash
cp .env.example .env   # fill it in
docker compose up -d --build
```

The database and uploads live in the `vitrina-data` volume. The platform
must be able to fetch `APP_URL/api/files/...`, so `APP_URL` has to be the
public HTTPS origin, not localhost.

Grant credits without Stripe:

```bash
docker compose exec vitrina node scripts/credits.mjs owner@example.com 500 "welcome"
```

## Vercel

1. Import the repo (framework Next.js, Node 22). The `vercel-build` script
   runs the migrations against Turso and then builds; functions never migrate
   on cold start.
2. Database: add the **Turso** integration (it injects `TURSO_DATABASE_URL`
   and `TURSO_AUTH_TOKEN`, both honoured) or set `DATABASE_URL` /
   `DATABASE_AUTH_TOKEN` yourself. A file database does not survive on
   serverless.
3. Storage: Storage → create a **Blob** store and connect it to the project;
   it injects `BLOB_READ_WRITE_TOKEN` and the app switches to Blob on its own.
4. Set `APP_SECRET`, `APP_URL` (the production URL), `HF_API_BASE_URL` and
   `PLATFORM_API_KEY`. Stripe and mail variables as needed; the Stripe
   marketplace integration only provides the keys, the three price ids and
   the webhook endpoint are still yours to create.

## Stripe

1. Create three recurring products/prices; put their ids in
   `STRIPE_PRICE_*`. Amounts should match `src/domain/plans.ts` (or edit it).
2. Add a webhook endpoint `APP_URL/api/billing/webhook` for
   `checkout.session.completed`, `invoice.paid`,
   `customer.subscription.updated`, `customer.subscription.deleted`; set
   `STRIPE_WEBHOOK_SECRET`.
3. Locally: `stripe listen --forward-to localhost:3000/api/billing/webhook`.

## Health

`GET /login` answers 200 when the server is up (the Dockerfile's healthcheck
uses it). Logs are plain stdout; generation calls are logged as
`[platform] request` / `[platform] response`.
