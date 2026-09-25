# Arquitectura de Subte

Este documento distingue entre lo **implementado** y lo **planificado**. Todo lo marcado _(planificado)_ tiene contratos o tablas preparadas, pero todavía no tiene código que lo ejecute.

## Diagrama

```
Celular en la sala ──audio PCM──▶ Deepgram (WebSocket directo, token temporal)   (planificado)
        │ frase terminada
        ▼
  API en Vercel ──▶ Supabase Postgres (segments, translations)                     (planificado)
        │  └──▶ OpenAI (traducción EN↔ES, resúmenes, capítulos)                    (planificado)
        ▼
  Supabase Realtime (un canal por charla)                                          (planificado)
        ▼
  Celulares del público: subtítulos en su idioma, notas, recap                     (planificado)

Implementado hoy:
  Navegador ──▶ Next.js en Vercel ──▶ Supabase Postgres
                 ├─ /       agenda (cliente anónimo, lectura por RLS)
                 └─ /admin  Server Actions (cliente service role, protegido por OPERATOR_KEY)
```

## Rol de cada servicio

| Servicio | Rol | Estado |
|---|---|---|
| Next.js en Vercel | Páginas, Server Actions y (a futuro) rutas API | Implementado |
| Supabase Postgres | Salas, sesiones, segmentos, traducciones, resúmenes, notas, logs | Implementado (esquema y RLS) |
| Supabase Realtime Broadcast | Un canal por charla para difundir subtítulos | Planificado |
| Supabase Auth anónima | Identidad sin registro para notas personales | Planificado |
| Deepgram Nova-3 | Transcripción en vivo por WebSocket con token temporal | Planificado |
| OpenAI | Traducción, resúmenes y capítulos | Planificado |

## Qué hay en el código hoy

- **Agenda (`app/page.tsx`, `lib/agenda.ts`):** Server Component que lee `stages` y `sessions` con el cliente de `lib/supabase/server.ts` (clave anónima). Ordena las sesiones de cada sala por estado (`live` → `scheduled` → `ended`) y luego por título; la primera es la sesión destacada.
- **Colores de línea (`lib/lines.ts`):** cada sala toma una línea A–D según su posición en la agenda, con los tokens `--line-a` a `--line-d` de `app/globals.css`.
- **Panel (`app/admin/`):** `page.tsx` muestra el login o el panel según `hasOperatorSession()`. `actions.ts` define `loginAction`, `logoutAction`, `createStageAction` y `createSessionAction`. La entrada se valida con `StageInSchema` y `SessionInSchema`, y la escritura usa `createAdminClient()` (service role).
- **Sesión de operador (`lib/operator.ts`):** compara la clave con `timingSafeEqual` sobre hashes SHA-256. La cookie `sc_operator` (httpOnly, `sameSite=lax`, `secure` en producción, 12 h) guarda un HMAC derivado de `OPERATOR_KEY`, nunca la clave.
- **Logs (`lib/log.ts`):** `logEvent(source, level, message, data)` escribe en `logs` con service role; si falla, solo registra en consola.

## Recorrido de una frase _(planificado)_

1. La estación de sala (`/stage`) pide a la API un token temporal de Deepgram y abre el WebSocket directamente desde el celular.
2. Envía audio PCM continuo. Deepgram devuelve resultados parciales (`is_final: false`) y finales (`is_final: true`).
3. **Armado de frases:** se concatenan los resultados `is_final` hasta recibir `speech_final` o un evento `UtteranceEnd`.
4. La frase se envía a `POST /api/segments` con `x-operator-key`, validada con `SegmentInSchema`. La inserción es idempotente por `unique (session_id, seq)`.
5. La API difunde un `SegmentEvent` en `live:{sessionId}`, traduce con OpenAI, guarda en `translations` y difunde un `TranslationEvent`.
6. Los parciales se difunden en `live:{sessionId}:interim`, limitados a **1 por segundo**, porque Supabase cuenta cada mensaje por destinatario.

## Modelo de datos

Definido en `scripts/001_schema.sql`.

| Tabla | Columnas principales | Notas |
|---|---|---|
| `stages` | `id`, `name` | Una fila por sala / línea |
| `sessions` | `id`, `stage_id`, `slug` (único), `title`, `speaker`, `source_lang` (`en`/`es`), `target_langs`, `glossary`, `mode` (`live`/`replay`), `status` (`scheduled`/`live`/`ended`), `started_at`, `ended_at`, `audio_url`, `video_url`, `video_offset_ms` | Una fila por charla |
| `segments` | `id`, `session_id`, `seq`, `lang`, `text`, `t_start_ms`, `t_end_ms`, `speaker`, `created_at` | `unique (session_id, seq)` |
| `translations` | `segment_id`, `lang`, `text` | PK `(segment_id, lang)` |
| `session_insights` | `session_id`, `kind` (`rolling`/`final`), `lang`, `payload` (jsonb), `updated_at` | PK `(session_id, kind, lang)`; `payload` sigue `InsightPayloadSchema` |
| `notes` | `id`, `user_id` (default `auth.uid()`), `session_id`, `t_ms`, `kind` (`note`/`bookmark`), `body`, `created_at` | Privadas por RLS |
| `logs` | `id`, `at`, `source`, `level`, `message`, `data` | Sin acceso público |

Índices: `sessions(stage_id)`, `segments(session_id, seq)`, `notes(user_id, session_id)`.

## Reloj de sesión _(planificado)_

- `t = 0` es `sessions.started_at`.
- Cada conexión a Deepgram guarda `connectionOffsetMs` = milisegundos entre `started_at` y el inicio de esa conexión.
- `tStartMs = connectionOffsetMs + start * 1000` (y lo mismo para `tEndMs` con `start + duration`).
- Al reconectar se recalcula el offset, así los tiempos siguen siendo continuos.
- Los tiempos son siempre **milisegundos enteros**: columnas `*_ms` en la base y campos `*Ms` en TypeScript (`msSchema` en `lib/schemas.ts` exige enteros no negativos).

## Conexión, pausa y reconexión _(planificado)_

- El audio se envía de forma continua; en silencios se manda `KeepAlive` como **frame de texto** para que Deepgram no cierre la conexión.
- **Pausa** (recesos): se envía `Finalize` y luego `CloseStream`. Al reanudar se abre una conexión nueva con token nuevo.
- **Reconexión:** backoff exponencial y token nuevo en cada intento. Como el envío de segmentos es idempotente por `(session_id, seq)`, reenviar una frase no la duplica.

## Modo replay _(planificado)_

`sessions.mode = 'replay'` reproduce una charla grabada (`audio_url`, y opcionalmente `video_url` con `video_offset_ms`) por el mismo flujo de transcripción, para demos y charlas pregrabadas.

## Resúmenes y capítulos _(planificado)_

El LLM genera un `InsightPayload` (`summary`, `keyIdeas` (hasta 7), `chapters` con `tStartMs` y `title`, `mentions`) con Structured Outputs, validado con zod y un reintento. Se guarda en `session_insights`: `rolling` durante la charla y `final` al terminar. Un `InsightEvent` avisa a los clientes que hay datos nuevos.

## Seguridad y RLS

- **Claves solo en servidor:** `SUPABASE_SERVICE_ROLE_KEY` y `OPERATOR_KEY` se leen únicamente en código de servidor. Las claves de Deepgram y OpenAI seguirán el mismo criterio _(planificado)_.
- **`OPERATOR_KEY`** protege hoy `/admin` y sus Server Actions. Está previsto que proteja también `/stage` y las rutas de escritura (`POST /api/segments` con el header `x-operator-key`).
- **RLS** (`scripts/002_rls.sql`), activado en todas las tablas:
  - `stages`, `sessions`, `segments`, `translations`, `session_insights`: lectura pública; sin políticas de escritura (solo el service role escribe).
  - `notes`: cada usuario lee, crea, edita y borra solo sus filas (`auth.uid() = user_id`); al crear, la sesión debe existir.
  - `logs`: RLS sin políticas, sin acceso público.

## Límites y escalado

| Recurso | Límite |
|---|---|
| Supabase Realtime Free | 200 conexiones simultáneas, 100 mensajes/s |
| Supabase Realtime Pro (sin tope de gasto) | 10.000 conexiones, 2.500 mensajes/s |
| Deepgram pay-as-you-go | Hasta 150 WebSockets simultáneos |

Un canal por charla mantiene el tráfico acotado a quienes miran esa sala. Limitar los parciales a 1/s es clave, porque cada mensaje se cuenta por destinatario.

## Cómo agregar un proveedor nuevo _(planificado)_

Las interfaces `SttProvider` y `LlmProvider` todavía no existen en el código. Los contratos que ya existen en `lib/schemas.ts` definen qué debe producir cada proveedor:

- Un proveedor de transcripción debe producir frases que cumplan `SegmentInSchema`:

  ```ts
  export const SegmentInSchema = z
    .object({
      sessionId: z.uuid(),
      seq: seqSchema,
      lang: LangSchema,
      text: z.string().trim().min(1).max(2000),
      tStartMs: msSchema,
      tEndMs: msSchema,
      speaker: z.number().int().nonnegative().optional(),
    })
  ```

- Un proveedor de LLM debe devolver resúmenes que cumplan `InsightPayloadSchema` y traducciones de texto plano por idioma (`LangSchema`: `en` | `es`).

Cuando se implementen las interfaces, este documento incluirá un ejemplo completo.
