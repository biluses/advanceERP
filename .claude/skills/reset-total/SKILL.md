---
name: reset-total
description: >-
  Cierra la sesión antes de compactar o reiniciar: vuelca el estado del trabajo en Vitrina a un .md
  de continuidad en docs/sessions/, pasa las reglas durables a CLAUDE.md y entrega el prompt para
  reanudar. Úsala cuando Sergio diga "reset-total", "reset total", "voy a compactar", "voy a
  colapsar", "guarda todo antes de compactar", "cierra la sesión", "prepárame para reiniciar",
  antes de un /compact, o cada ~350k tokens en una sesión autónoma larga.
---

# reset-total — guardar la sesión antes de compactar

Objetivo: que después de compactar o de abrir una sesión nueva no se pierda nada que importe, y
que Sergio no tenga que volver a dictar las instrucciones de siempre.

Tres salidas, siempre las tres: **un .md de estado**, **CLAUDE.md al día**, y **un prompt de
reanudación**.

## Procedimiento

### 1. Recoger lo que hay que salvar

Sale de la conversación actual. No se reconstruye de memoria ni se inventa. Seis cajones:

1. **Pendiente de cerrar**: cambios sin commit, commits sin push, PR abiertas o pedidas, checks
   rojos, preguntas hechas a Sergio que esperan respuesta. Para cada uno: qué es, estado real
   (escrito, probado, commiteado, pusheado) y dónde está.
2. **Estado del trabajo**: rama, último commit (hash corto), qué ha cambiado en esta sesión por
   capa (`src/domain`, `src/generation`, `src/server`, `src/studio`, `src/ui`, `src/app`, docs,
   infra), y el resultado exacto de la última pasada de `pnpm lint`, `pnpm typecheck`,
   `pnpm test`, `pnpm build`, `pnpm test:e2e` (número de tests, verde o rojo).
3. **Correcciones de datos**: cualquier cosa que se creía y resultó falsa (una API que no se
   comporta como se suponía, un flag que no existe, una versión incompatible). Esto es lo que más
   valor tiene, porque es lo que se vuelve a colar si se pierde.
4. **Decisiones tomadas**: producto, arquitectura, nombres, precios, alcance descartado — con el
   motivo en una línea. Lo que Sergio decidió, separado de lo que decidió el agente.
5. **Reglas nuevas** que Sergio haya dado durante la sesión.
6. **Entregables generados**: rutas de ficheros y URLs (rama, PR, artefactos).

### 2. Verificar antes de escribir

- **Comprobar que cada ruta existe** con `ls` antes de listarla. Un fichero que no existe no se
  lista.
- **Comprobar git**: `git status --short`, `git log --oneline -5`, `git log origin/<rama> -1`.
  Nada se da por commiteado o pusheado si no consta ahí.
- Si hay en `docs/sessions/` ficheros de estado **que no se escribieron en esta sesión**, se listan
  marcados como "de otra sesión" y **no se describe lo que no se ha leído**.
- **Releer `CLAUDE.md`**: si otra sesión añadió reglas desde que empezó esta, cruzarlas con los
  pendientes; una regla nueva puede cambiar un cambio que está a punto de salir.
- **Repasar el scratchpad** de la sesión (`CONTEXT.md` si existe) y absorber lo que siga vigente.

### 3. Escribir el .md de estado

Ruta: `docs/sessions/estado-sesion-<AAAA-MM-DD>.md` (fecha de hoy). Si ya hay uno de hoy, se
sustituye y la cabecera dice que sustituye al anterior.

Estructura fija, en este orden:

1. Pendiente de cerrar (tabla: qué · estado real · dónde está)
2. Estado del trabajo (rama, commit, cambios por capa, resultado de los checks)
3. Correcciones de datos
4. Decisiones tomadas
5. Reglas nuevas
6. Entregables (tabla con rutas y URLs verificadas)
7. Herramientas y estado técnico (servidores en marcha, puertos, env local, mock, Chromium,
   lo que no se pudo probar y por qué)
8. Límites duros (lo que no se hace sin preguntar: push a otra rama, PR, borrar, producción)

### 4. Persistir

- El .md va en el repo: `git add docs/sessions/... && git commit` **solo del .md**, nunca mezclado
  con código a medias. Se pushea a la rama de trabajo si esa rama ya se pusheaba en la sesión.
- Si hay código sin commit que Sergio no ha pedido commitear, se deja como está y se anota en
  "Pendiente de cerrar".

### 5. CLAUDE.md

Solo si hay una **regla nueva y durable** o una **corrección de algo que ya está escrito**:

- Regla nueva → una línea en "Rules of the house" (o un comando nuevo en la tabla).
- Corrección → editar la línea existente, no añadir otra que la contradiga.
- No guardar lo que ya está en el repo, en el git o en el propio .md de estado.

### 6. Entregar el prompt de reanudación

En un bloque de código, listo para pegar. Tiene que:

- Nombrar el .md de estado y pedir que se lea primero, junto con `CLAUDE.md`.
- Nombrar la rama y el último commit.
- Resumir en cinco o seis líneas lo imprescindible: pendientes, checks rojos y límites duros.
- **No** repetir el .md entero.

## Reglas duras

- **Nunca escribir secretos** en el .md, en CLAUDE.md ni en el prompt: `APP_SECRET`, claves de
  plataforma, tokens de Stripe, contraseñas de cuentas de prueba. Si se detectó uno durante la
  sesión, se nombra el problema, no el valor. `.env` no se cita por contenido.
- Hashes, rutas, cifras y números de tests exactos. Lo no verificado se marca como tal.
- Cero emojis e iconos.
- Esta skill **no pushea código, no abre PR y no toca producción**. Solo guarda el estado.
- Si el commit del .md falla, el .md y el prompt se entregan igual. La persistencia nunca bloquea
  la entrega.

## Salida al usuario

Corta. Tres líneas como mucho sobre qué se ha guardado y dónde, y el bloque con el prompt de
reanudación. Si al releer CLAUDE.md o el scratchpad ha salido algo que cambia un pendiente, se
dice en una línea.
