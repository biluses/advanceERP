# Estado de sesión — 2026-09-19

Sesión: https://claude.ai/code/session_01QktEqYfYA1H2gQRbvG88pU (empezó el 2026-09-18). Primer fichero de estado del repo; no sustituye a ninguno.

## 1. Pendiente de cerrar

| Qué | Estado real | Dónde |
| --- | --- | --- |
| `APP_SECRET` en Vercel (proyecto `vitrina`) | **No definido.** `/login` y `/register` devuelven 500 con `Missing APP_SECRET` en el último deploy READY (`dpl_4QVErpQXn4AkRskvCkJ2FApqhcCj`). El agente no puede crearla (403 del conector). Sergio debe añadirla en Settings → Environment Variables y avisar. | Vercel dashboard |
| `APP_URL`, `HF_API_BASE_URL`, `PLATFORM_API_KEY` en Vercel | Sergio dijo "he fakeado los secrets"; no verificable desde el conector (403 al listar variables). Si `PLATFORM_API_KEY` no es `id:secret`, la app arranca en modo "sin clave". | Vercel dashboard |
| Redeploy tras poner `APP_SECRET` | Pendiente. El agente puede lanzarlo con `create_deployment` (ya lo hizo dos veces con éxito). | Conector Vercel |
| Prueba de registro en producción | Pendiente de lo anterior. | `https://vitrina-biluses-projects.vercel.app` |
| Clave real de Higgsfield y `HF_API_BASE_URL` real | Sergio no la tiene aún. Sin ella solo falla Generate (créditos se devuelven). | — |
| Stripe (precios, webhook) y Resend (reset de contraseña) | No configurados. Opcionales. | Vercel env + Stripe |
| Licencia del upstream open-higgsfield | Sin LICENSE en el repo origen. Documentado en `NOTICE.md`. Decisión de Sergio antes de vender. | `NOTICE.md` |

Sin cambios locales sin commit. Sin PR abierta (las #1, #2 y #3 están fusionadas).

## 2. Estado del trabajo

- Rama de trabajo: `claude/clone-build-autonomous-repo-lou6ef`, reiniciada desde `origin/master` para este fichero. `origin/master` = `59c8f6e` (merge de la PR #3). Último commit de código: `d779fe7`.
- Repo: `biluses/advanceERP` (nombre heredado; el producto es Vitrina). `master` tiene Vitrina; el ERP PHP quedó solo en el historial.
- Cambios de la sesión, por capa:
  - `src/domain`: canales, presets (11), compilador de prompts, pricing, planes, export. Tests.
  - `src/generation`: motor heredado; acciones autenticadas con créditos; poll con settle en servidor; BYOK sellado.
  - `src/server`: sesión, workspaces e invitaciones, créditos (ledger atómico), runs (settle y paginación), billing Stripe, mail (Resend), storage local/Blob, `db/env.ts` (resolver de variables de BD por valor).
  - `src/studio`: job rail producto/preset/canal, preview de prompt, revisión, filtros, paginación, skills.
  - `src/ui` + `src/app`: landing, login/register/forgot/reset, /app (studio, productos, marca, campañas, ajustes), /join/[token] (route handler), API upload/files/blob/billing webhook.
  - Infra: CI GitHub Actions, Dockerfile standalone, compose, `vercel-build` (migra en build), instrumentation Node-only, `.env.example`.
  - Docs: README, ARCHITECTURE, DEPLOY, VERTICAL, NOTICE, CLAUDE.md, skills `reset-total` y `wipe-local`.
- Última pasada de checks (sobre `d779fe7`, local): `pnpm lint` limpio; `pnpm typecheck` limpio; `pnpm test` 38 pasados; `VERCEL=1 pnpm build` OK sin standalone; `pnpm build` OK con standalone; `pnpm test:e2e` 5 pasados (sobre `5e70ae3`, antes de los tres últimos commits que solo tocan `db/env`, scripts e instrumentation).
- Vercel: proyecto `vitrina` (`prj_v3A0fzreA2lsYbmHMTjkYkVYPcy1`, team `team_lA9KbjZJDeOqum7kBVyOfFPy`, plan Hobby, Node 24). Último deploy de producción READY: `dpl_4QVErpQXn4AkRskvCkJ2FApqhcCj` (commit `59c8f6e`). Turso conectada (`database-indigo-house`, variables `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`, migración "remote" OK en build). Blob público creado y conectado por Sergio (nombre no verificado desde el conector; el privado `vitrina-uploads` debía borrarse).

## 3. Correcciones de datos

- `output: "standalone"` rompe el build en Vercel (`ENOENT .next/next-server.js.nft.json`). Solo se activa cuando no hay `process.env.VERCEL`.
- `next start` avisa con standalone; `pnpm start` y el e2e usan `scripts/start-standalone.mjs`.
- El diálogo "Connect a Project" de Turso permite elegir prefijo de variables (por defecto `STORAGE_URL`); en la práctica creó `TURSO_DATABASE_URL`. El resolver acepta cualquiera.
- El diálogo "Create Blob Store" crea por defecto solo `BLOB_STORE_ID` y `BLOB_WEBHOOK_PUBLIC_KEY`; `BLOB_READ_WRITE_TOKEN` requiere marcar "Add a read-write token env var". Un store **Private** no sirve: la plataforma descarga las fotos por URL sin credenciales.
- El conector Vercel de esta sesión puede: listar proyectos/deploys, leer logs de build y runtime, crear deployments. No puede: listar ni crear variables de entorno, crear stores, listar integraciones (403).
- La skill `security-review` falla en este entorno (`origin/HEAD` no definido).
- Playwright necesita `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` aquí.
- ESLint 10 es incompatible con `eslint-plugin-react` 7.x; el repo fija ESLint 9.
- Una página no puede escribir cookies ni gastar tokens (se renderiza más de una vez): el join es un route handler.
- La PR #1 se fusionó antes del push de `52f9522`; la PR #2 lo recuperó con cherry-pick.
- Un valor de `APP_SECRET` generado por el agente quedó en la transcripción de la sesión (intento fallido de crearlo vía conector). No usarlo; generar uno nuevo.

## 4. Decisiones tomadas

- Sergio: vaciar el repo, clonar open-higgsfield y construir un vertical vendible (2026-09-18). Fusionar por PR (#1, #2, #3). Desplegar en Vercel. Nombre `reset-total` para la skill de cierre de sesión (adaptada de la suya).
- Agente: industria e-commerce; nombre Vitrina; modelo SaaS con créditos + BYOK; planes 29/99/249 €; Drizzle + libsql/Turso; better-auth; Stripe; presets como datos; store Blob público; `wipe-local` como nombre del reset de entorno (antes lo llamó `reset-total` por error).

## 5. Reglas nuevas

- De Sergio: fusionar a `master` mediante PR, no push directo. Las instrucciones de la skill `reset-total` (original en `/root/.claude/uploads/.../3c6fb4b4-SKILL.md`, adaptada en el repo).
- De la sesión (ya en CLAUDE.md o código): créditos solo vía `src/server/credits.ts`; `"use server"` exporta solo async; migraciones en build en Vercel.

## 6. Entregables

| Ruta / URL | Verificado |
| --- | --- |
| `README.md`, `NOTICE.md`, `CLAUDE.md` | sí |
| `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`, `docs/VERTICAL.md`, `docs/screenshots/` | sí |
| `.claude/skills/reset-total/SKILL.md`, `.claude/skills/wipe-local/SKILL.md` | sí |
| `scripts/mock-platform.mjs`, `migrate.mjs`, `db-env.mjs`, `credits.mjs`, `wipe-local.mjs`, `start-standalone.mjs` | sí |
| `e2e/studio.spec.ts`, `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml` | sí |
| PR #1, #2, #3: https://github.com/biluses/advanceERP/pulls (fusionadas) | sí |
| Producción: https://vitrina-biluses-projects.vercel.app (500 en /login hasta `APP_SECRET`) | sí |

## 7. Herramientas y estado técnico

- Sin servidores locales en marcha. `.env` local existe (apunta al mock en :4010, clave de prueba) y no está en git.
- Mock de plataforma: `pnpm mock:platform` (:4010). Dev: `pnpm dev` (:3000). E2E: build standalone en :3100 + mock en :4110.
- Docker: sin daemon en el contenedor; imagen no construida. Standalone probado directamente.
- Stripe: solo tests con eventos simulados. Higgsfield real: sin clave, no probado.
- Curl a `*.vercel.app` desde este entorno devuelve 403 del proxy; usar `web_fetch_vercel_url` del conector.

## 8. Límites duros

- No push a `master`; cambios por PR desde `claude/clone-build-autonomous-repo-lou6ef` (reiniciada desde master tras cada merge).
- No borrar nada en Vercel ni tocar producción sin que Sergio lo pida; redeploy sí (lo pidió).
- No escribir secretos en repo, chat ni logs.
- No fusionar PRs: las fusiona Sergio.
