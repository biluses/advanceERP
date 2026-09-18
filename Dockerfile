# syntax=docker/dockerfile:1.7
# Vitrina — single-container deployment. The database and uploads live in
# /data, so mount a volume there.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production
ARG NEXT_PUBLIC_STORAGE_DRIVER=local
ARG NEXT_PUBLIC_SITE_URL=
ENV NEXT_PUBLIC_STORAGE_DRIVER=$NEXT_PUBLIC_STORAGE_DRIVER NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ENV DATA_DIR=/data DATABASE_URL=file:/data/vitrina.db STORAGE_DRIVER=local
WORKDIR /app
RUN groupadd --system vitrina && useradd --system --gid vitrina --home /app vitrina \
    && mkdir -p /data && chown vitrina:vitrina /data
COPY --from=build --chown=vitrina:vitrina /app/.next/standalone ./
COPY --from=build --chown=vitrina:vitrina /app/.next/static ./.next/static
COPY --from=build --chown=vitrina:vitrina /app/public ./public
COPY --from=build --chown=vitrina:vitrina /app/drizzle ./drizzle
COPY --from=build --chown=vitrina:vitrina /app/scripts/credits.mjs ./scripts/credits.mjs
# Migrations run inside the server on boot (src/instrumentation.ts); the
# credits script rides along for operators without Stripe.
USER vitrina
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://localhost:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
