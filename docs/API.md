# API y eventos en tiempo real

## Estado actual

Todavía **no hay rutas en `app/api/`**. Las escrituras de hoy se hacen con **Server Actions** del panel de operadores. Los contratos de las rutas y los eventos planificados ya están definidos en `lib/schemas.ts` y se documentan abajo.

## Server Actions (implementadas)

Definidas en `app/admin/actions.ts`. Se invocan desde los formularios de `/admin`, no como endpoints HTTP públicos. Todas devuelven `FormState`:

```ts
type FormState = {
  ok: boolean
  message: string
  fieldErrors?: Record<string, string[] | undefined>
}
```

| Acción | Entrada (`FormData`) | Autorización | Resultado |
|---|---|---|---|
| `loginAction` | `key` | Compara con `OPERATOR_KEY` | Crea la cookie `sc_operator`. Clave incorrecta: `ok: false` y registro `warn` en `logs` |
| `logoutAction` | — | — | Borra la cookie |
| `createStageAction` | `name` (2–80 caracteres) | Cookie de operador | Inserta en `stages` |
| `createSessionAction` | `stageId` (uuid), `slug` (3–80, `^[a-z0-9]+(?:-[a-z0-9]+)*$`), `title` (3–200), `speaker` (opcional, hasta 120), `sourceLang` (`en`/`es`), `glossary` (términos separados por coma, hasta 100) | Cookie de operador | Inserta en `sessions` con `target_langs = {es,en}` |

Errores:

- Sin sesión de operador: mensaje "no autorizado".
- Validación zod fallida: `fieldErrors` por campo.
- Slug duplicado (Postgres `23505`): error en el campo `slug`.
- Otros errores de base de datos: mensaje genérico; el detalle queda en `logs`.

## Formato de respuesta de la API (planificado)

```ts
type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }
```

## `POST /api/segments` (planificado)

Recibe una frase terminada desde la estación de sala.

- **Header requerido:** `x-operator-key: <OPERATOR_KEY>`
- **Cuerpo** (`SegmentInSchema`):

```json
{
  "sessionId": "00000000-0000-4000-b000-000000000001",
  "seq": 42,
  "lang": "en",
  "text": "Open source is a team sport.",
  "tStartMs": 125300,
  "tEndMs": 128150,
  "speaker": 0
}
```

Reglas: `seq`, `tStartMs` y `tEndMs` son enteros no negativos; `tEndMs >= tStartMs`; `text` tiene entre 1 y 2000 caracteres; `speaker` es opcional.

- **Idempotencia:** `unique (session_id, seq)` en `segments`; reenviar el mismo `seq` no duplica la frase.
- **Respuesta:** `ApiResult<T>`.

## Canales de Supabase Realtime (planificado)

Un canal de **Broadcast** por charla.

### `live:{sessionId}`

Eventos validados por `LiveEventSchema` (unión discriminada por `type`):

```json
{ "type": "segment", "id": "uuid", "seq": 42, "lang": "en", "text": "Open source is a team sport.", "tStartMs": 125300, "tEndMs": 128150 }
```

```json
{ "type": "translation", "segmentId": "uuid", "seq": 42, "lang": "es", "text": "El open source es un deporte de equipo." }
```

```json
{ "type": "insight", "kind": "rolling" }
```

`kind` puede ser `rolling` o `final`. Avisa que hay un resumen nuevo en `session_insights`.

```json
{ "type": "status", "status": "live" }
```

`status` puede ser `live`, `paused` o `ended`.

### `live:{sessionId}:interim`

Resultados parciales (`InterimEventSchema`), limitados a 1 por segundo:

```json
{ "type": "interim", "lang": "en", "text": "Open source is a", "tStartMs": 125300 }
```

## Resúmenes (planificado)

`session_insights.payload` sigue `InsightPayloadSchema`:

```json
{
  "summary": "…",
  "keyIdeas": ["…"],
  "chapters": [{ "tStartMs": 0, "title": "Introducción" }],
  "mentions": [{ "name": "Kubernetes", "kind": "tool", "url": "https://kubernetes.io" }]
}
```

`keyIdeas` admite hasta 7 elementos; `mentions[].kind` es `tool`, `project`, `person` o `concept`.
