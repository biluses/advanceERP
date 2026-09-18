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

Migrations run automatically when the server boots.

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

1. Import the repo. Build command `pnpm build`, Node 22.
2. Database: Turso (`DATABASE_URL=libsql://…`, `DATABASE_AUTH_TOKEN`). A
   file database does not survive on serverless.
3. Storage: create a Blob store, set `BLOB_READ_WRITE_TOKEN`,
   `STORAGE_DRIVER=blob`, `NEXT_PUBLIC_STORAGE_DRIVER=blob`.
4. Set the remaining variables from the table.

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
