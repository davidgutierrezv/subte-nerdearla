# StageCaptions — Plan técnico v2 (Vibeathon Nerdearla 2026)

> **Condición de trabajo:** todo se construye desde **el celular, usando solo v0** (chat de v0 + integraciones de Vercel/Supabase + navegador del celular). No hay notebook ni terminal.
> **Stack decidido:** Deepgram (transcripción en vivo) + OpenAI API (traducción, resúmenes, capítulos) + Supabase (datos, tiempo real, login, archivos) + Next.js en Vercel (generado y publicado con v0).
> Nombre del proyecto provisorio. Este documento se pega en las **instrucciones del proyecto en v0** y se adjunta como archivo.

---

## 1. Qué construimos

1. **Subtítulos en vivo** por sala: idioma original (EN o ES) + traducción (EN→ES y ES→EN).
2. **Varias salas en paralelo** (demo: 1–2 en vivo real + 8–10 simuladas).
3. **Vista de audiencia**: el público elige sala e idioma desde su celular.
4. **Diferencial**: resumen, ideas principales, capítulos con marca de tiempo y **notas/marcadores personales** anclados al minuto de la charla.
5. **Open source**: licencia Apache-2.0, guía de despliegue y proveedores intercambiables.

### Consecuencias de trabajar solo con celular + v0
- **Cualquier celular es una estación de sala**: la página `/stage/[id]` usa el micrófono del teléfono o la entrada de audio. Esto pasa a ser un argumento de venta: una conferencia no necesita comprar hardware.
- **La simulación de salas se hace en el navegador**, no con ffmpeg: la estación acepta como fuente un **archivo de audio** (URL en Supabase Storage) en lugar del micrófono.
- **Modo Replay**: para mostrar 10 salas sin tener 10 dispositivos, una charla grabada se procesa una vez y la audiencia la ve avanzar sincronizada con el reloj (etiquetada como "demo").
- **Depuración sin consola**: panel de diagnóstico en pantalla y tabla `logs` en Supabase.
- **Las pruebas de micrófono se hacen en la URL publicada**, no en la vista previa de v0 (la vista previa corre en un iframe que puede bloquear el micrófono).

### No objetivos
- Ingesta RTMP/SRT sin navegador (queda documentada como extensión: worker Node).
- Alineación automática audio↔video (solo desfase manual).
- Edición humana de subtítulos en vivo.

---

## 2. Decisiones de arquitectura

| Tema | Decisión | Motivo |
|---|---|---|
| Transcripción | **Deepgram Nova-3 streaming** | Baja latencia, marcas por palabra, US$ 200 de crédito al registrarse, hasta 150 WebSockets en pay-as-you-go |
| Conexión a Deepgram | Directa desde el navegador de la estación con **token temporal** (`POST /v1/auth/grant`, TTL 60 s) | Sin servidor de larga duración: el token solo debe valer al abrir el WebSocket |
| Captura de audio | **PCM 16 kHz mono (linear16) vía AudioWorklet**, no MediaRecorder | Funciona igual en Android, iPhone y escritorio (Safari no graba webm/opus) y permite mezclar micrófono o archivo |
| Traducción, resúmenes, capítulos | **OpenAI API**, modelo pequeño vigente (familia mini/nano), detrás de `LlmProvider` | Deepgram no traduce y su resumen/temas son solo inglés y sin capítulos |
| App y API | **Next.js App Router en Vercel**, generado y publicado con v0 | Única herramienta disponible; deploy en un toque |
| Datos, tiempo real, login, archivos | **Supabase** (Postgres + Realtime Broadcast + Auth anónima + Storage), conectado con la integración de v0 | Open source, se puede autoalojar, reparto en vivo sin servidor propio |
| Intercambiables | `SttProvider` (cliente) y `LlmProvider` (servidor) | Criterio open source: Gemini, Whisper u Ollama local mañana |
| Licencia | Apache-2.0 | Aprobada por OSI |

**No se usan WebSockets de Vercel.** El único WebSocket largo es estación → Deepgram; el reparto al público lo hace Supabase Realtime.

---

## 3. Arquitectura

```
ESTACIÓN DE SALA (cualquier celular o notebook con Chrome/Safari)
 /stage/[stageId]
  Fuente: micrófono  ─┐
  Fuente: archivo URL ┼─▶ AudioWorklet → PCM 16 kHz ─▶ WSS Deepgram (token de /api/stt/token)
                      │                                   │ interim / final + tiempos
                      │                           SegmentAssembler (+ reloj de sesión)
                      │          ┌────────────────────────┴──────────────┐
                      │   interim (1/s)                            segmento final
                      │          ▼                                       ▼
                      │  Supabase Realtime                    POST /api/segments (Vercel)
                      │  canal live:{id}:interim               ├─ upsert segments
                      │                                        ├─ broadcast "segment"
                      │                                        ├─ OpenAI → translations
                      │                                        └─ broadcast "translation"
AUDIENCIA (celular)                                            ▼
 /s/[slug]?lang=es  ◀──────────── Supabase Realtime canal live:{id}
  historial (SELECT) + vivo, notas y marcadores (Auth anónima + RLS)
 /s/[slug]/recap    ◀── session_insights (resumen, ideas, capítulos)

RESÚMENES: la estación llama POST /api/sessions/[id]/summarize cada 5 min y al cerrar.
REPLAY (demo): POST /api/replay/import {audioUrl} → Deepgram pre-grabado → segmentos con tiempos
               → traducción por lotes → la audiencia los revela según now() - started_at.
```

### Rol de cada servicio
- **Vercel (vía v0)**: páginas y rutas API cortas (token, segmentos, resúmenes, import de replay).
- **Supabase Postgres**: `sessions`, `segments`, `translations`, `session_insights`, `notes`, `logs`.
- **Supabase Realtime Broadcast**: un canal por charla; se publica una vez y llega a todos los suscritos.
- **Supabase Auth anónima**: cada visitante obtiene un usuario sin registrarse; sus notas quedan protegidas por RLS. (Magic link opcional para conservarlas entre dispositivos.)
- **Supabase Storage**: audios de demo (bucket público `demo-audio`) y, opcional, grabaciones.
- **Deepgram**: transcripción en vivo y pre-grabada (replay).
- **OpenAI**: traducción por frase, resúmenes, ideas y capítulos (JSON con Structured Outputs).

---

## 4. Stack y convenciones de código

- TypeScript estricto. Next.js App Router. Tailwind + shadcn/ui (lo que genera v0).
- `@supabase/supabase-js` + `@supabase/ssr`. ******** SDK oficial (solo servidor). Deepgram: `fetch` en servidor para el token y el pre-grabado; WebSocket nativo en el navegador.
- `zod` para validar todo lo que entra a las rutas API y todo JSON devuelto por el LLM.

### Estructura
```
/app
  page.tsx                          # agenda: salas y sesiones en vivo
  s/[slug]/page.tsx                 # audiencia
  s/[slug]/recap/page.tsx           # resumen, capítulos, notas, video
  stage/[stageId]/page.tsx          # estación de sala + panel de diagnóstico
  simulate/page.tsx                 # varias fuentes de archivo en paralelo
  admin/page.tsx                    # alta de salas/sesiones, importar replay
  api/stt/token/route.ts
  api/segments/route.ts
  api/interim/route.ts              # opcional P2 (si se cierra el canal público)
  api/sessions/[id]/start/route.ts
  api/sessions/[id]/summarize/route.ts
  api/sessions/[id]/close/route.ts
  api/replay/import/route.ts
/lib
  stt/provider.ts  stt/deepgram.ts  stt/pcm-worklet.ts  stt/segment-assembler.ts
  llm/provider.ts  llm/********.ts    llm/prompts/{translate,insights}.ts
  realtime/channels.ts   schemas.ts   i18n/{es,en}.ts   log.ts
/scripts/001_schema.sql  002_rls.sql  003_seed.sql
/docs/DEPLOY.md  /docs/ARCHITECTURE.md   LICENSE   README.md
```

### Convenciones
- Identificadores en inglés; textos de UI en español con `lib/i18n`.
- Archivos `kebab-case`, componentes `PascalCase`, tablas y columnas `snake_case`.
- **Tiempos en milisegundos enteros**, sufijo `_ms` / `Ms`.
- Contratos únicos en `lib/schemas.ts` (sección 6); todo lo importa desde ahí.
- Secretos solo en servidor: ********, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPERATOR_KEY`. Nunca `NEXT_PUBLIC_`.
- Rutas API responden `{ ok: true, data }` o `{ ok: false, error: { code, message } }`, y registran errores en la tabla `logs`.
- Lógica en hooks (`useStageStreamer`, `useLiveCaptions`, `useNotes`) y en `/lib`, no en las páginas.
- Un cambio por prompt de v0. Después de cada prompt que funcione: publicar y sincronizar con GitHub.

---

## 5. Modelo de datos

```sql
create table stages (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references stages(id),
  slug text unique not null,
  title text not null,
  speaker text,
  source_lang text not null check (source_lang in ('en','es')),
  target_langs text[] not null default '{es,en}',
  glossary text[] default '{}',
  mode text not null default 'live' check (mode in ('live','replay')),
  status text not null default 'scheduled' check (status in ('scheduled','live','ended')),
  started_at timestamptz,               -- t = 0
  ended_at timestamptz,
  audio_url text,                       -- replay o grabación
  video_url text,
  video_offset_ms int default 0
);

create table segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  seq int not null,
  lang text not null,
  text text not null,
  t_start_ms int not null,
  t_end_ms int not null,
  speaker int,
  created_at timestamptz default now(),
  unique (session_id, seq)
);

create table translations (
  segment_id uuid references segments(id) on delete cascade,
  lang text not null,
  text text not null,
  primary key (segment_id, lang)
);

create table session_insights (
  session_id uuid references sessions(id) on delete cascade,
  kind text check (kind in ('rolling','final')),
  lang text not null,
  payload jsonb not null,
  updated_at timestamptz default now(),
  primary key (session_id, kind, lang)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null default auth.uid(),
  session_id uuid references sessions(id) on delete cascade,
  t_ms int not null,
  kind text check (kind in ('note','bookmark')) default 'note',
  body text,
  created_at timestamptz default now()
);

create table logs (
  id bigserial primary key,
  at timestamptz default now(),
  source text, level text, message text, data jsonb
);
```

**RLS**
- `stages`, `sessions`, `segments`, `translations`, `session_insights`: `select` público; escritura solo con service role (rutas API).
- `notes`: todo solo donde `user_id = auth.uid()`.
- `logs`: sin acceso público.
- Habilitar **Anonymous Sign-Ins** en Supabase Auth.

---

## 6. Contratos (`lib/schemas.ts`)

```ts
type Lang = 'en' | 'es';

// Canal live:{sessionId}  (Broadcast)
type LiveEvent =
  | { type: 'segment';     id: string; seq: number; lang: Lang; text: string; tStartMs: number; tEndMs: number }
  | { type: 'translation'; segmentId: string; seq: number; lang: Lang; text: string }
  | { type: 'insight';     kind: 'rolling' | 'final' }        // el cliente vuelve a leer
  | { type: 'status';      status: 'live' | 'paused' | 'ended' };

// Canal live:{sessionId}:interim  (solo quien activa "texto provisorio")
type InterimEvent = { type: 'interim'; lang: Lang; text: string; tStartMs: number };

// POST /api/segments   header: x-operator-key
type SegmentIn = { sessionId: string; seq: number; lang: Lang; text: string; tStartMs: number; tEndMs: number; speaker?: number };

// Salida del LLM (Structured Outputs + validación zod; 1 reintento)
type InsightPayload = {
  summary: string;                                    // 3–5 frases
  keyIdeas: string[];                                 // máx. 7
  chapters: { tStartMs: number; title: string }[];    // tStartMs debe existir en un segmento
  mentions: { name: string; kind: 'tool'|'project'|'person'|'concept'; url?: string }[];
};
```
- `seq` lo genera la estación; el servidor hace `upsert` por `(session_id, seq)` → reintentos idempotentes.
- La audiencia ordena por `seq`, descarta duplicados y guarda traducciones que lleguen antes que su segmento.

---

## 7. Flujos

### 7.1 Estación de sala `/stage/[stageId]`
1. Operador ingresa la clave de operador, elige la sesión y la **fuente**: micrófono o archivo (URL de audio).
2. `POST /api/sessions/[id]/start` → `status=live`, `started_at=now()` si estaba vacío.
3. `GET /api/stt/token` (con `x-operator-key`) → token temporal Deepgram.
4. WebSocket: `wss://api.deepgram.com/v1/listen?model=********&language={source_lang}&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&smart_format=true&punctuate=true&endpointing=300&utterance_end_ms=1000&vad_events=true` + un `keyterm=` por término del glosario (máx. 500 tokens, ideal 20–50; verificar soporte en español).
   - Autenticación en navegador: subprotocolo `['token', <token>]` o el que indique la doc vigente para tokens temporales (confirmar en la doc; si es JWT puede ser `['bearer', <token>]`).
5. Audio:
   - `AudioContext` → fuente (`getUserMedia({ audio: { echoCancellation:false, noiseSuppression:false, autoGainControl:false } })` o `<audio crossOrigin="anonymous">` + `createMediaElementSource`) → **AudioWorklet** que baja a 16 kHz mono Int16 → envía frames de ~100 ms.
   - En iPhone, el `AudioContext` solo arranca tras un toque del usuario: el botón **Iniciar** lo crea/reanuda.
6. `SegmentAssembler`:
   - `is_final=false` → interim (máx. 1 por segundo) al canal `live:{id}:interim`.
   - Concatenar todos los `is_final=true` hasta `speech_final=true` o `UtteranceEnd` → segmento → `POST /api/segments`. Nunca usar `speech_final` solo.
   - Cortar igual si el segmento supera ~20 s o 250 caracteres.
7. Audio continuo mientras la sesión está en vivo (el silencio también se envía). `{"type":"KeepAlive"}` como frame **de texto** cada 5 s solo como red de seguridad (sin audio ni KeepAlive por 10 s, Deepgram corta con `NET-0001`).
8. **Pausa** del operador: `{"type":"Finalize"}` → `{"type":"CloseStream"}`. Al reanudar, conexión nueva y offset nuevo.
9. Cada 5 min: `POST /api/sessions/[id]/summarize?kind=rolling`.
10. **Finalizar**: `Finalize` → esperar `from_finalize` (máx. 2 s) → cerrar segmento → `CloseStream` → `POST /api/sessions/[id]/close` (resumen final, capítulos en ES y EN).
11. **Wake Lock** activado mientras transmite; aviso grande "No bloquees la pantalla ni cambies de app" (en celular, al salir de la app se corta el audio).
12. **Panel de diagnóstico** en pantalla: estado de la conexión, último evento de Deepgram, segmentos enviados/fallidos, latencia de `/api/segments`, deriva del reloj, nivel de audio (vúmetro).

### 7.2 Reloj de sesión (crítico)
- `t = 0` = `sessions.started_at`.
- Deepgram da `start`/`duration` en segundos relativos al **audio recibido por esa conexión**.
- Al abrir cada conexión: `connectionOffsetMs = Date.now() - startedAtMs`.
- `tStartMs = connectionOffsetMs + round(start*1000)`; `tEndMs = tStartMs + round(duration*1000)`.
- No mantener conexiones "vivas" sin audio: el reloj de Deepgram se detiene y las marcas se atrasan.
- Cada 60 s comparar el reloj de Deepgram con el real; si difieren más de 3 s, mostrar aviso y registrar en `logs`.
- Video: `video_t = t_ms + video_offset_ms` (ajuste manual en el recap).

### 7.3 Reconexión
- `close`/`error` → backoff 0,5 s, 1 s, 2 s… máx. 10 s; token nuevo en cada intento; offset nuevo.
- Desconectado: se descarta el audio (no se acumula) y la UI muestra **RECONECTANDO** en rojo.
- `POST /api/segments` con 3 reintentos y cola en memoria; idempotente por `seq`.

### 7.4 `POST /api/segments`
1. Validar con zod + `x-operator-key`.
2. `upsert` en `segments` → broadcast `segment` (cliente Supabase con service role).
3. Por cada `target_lang ≠ lang`: `LlmProvider.translate()` con los 2 segmentos previos de contexto y el glosario → `upsert` en `translations` → broadcast `translation`.
4. Responder en < 2 s. Si el LLM falla, responder `ok` igual y registrar en `logs`.

### 7.5 Audiencia `/s/[slug]?lang=es`
- Carga sesión + últimos 200 segmentos con traducciones; luego se suscribe a `live:{id}`.
- Muestra 2–3 líneas grandes, historial desplazable, botón **Volver al vivo**.
- Interruptor "texto provisorio" (solo en el idioma original) → se suscribe a `live:{id}:interim`.
- Controles: tamaño de letra, alto contraste, modo pantalla de sala (pantalla completa, fondo negro).
- **Marcar** (un toque) y **Nota** → login anónimo automático de Supabase; guardado con `t_ms` actual.
- Sesiones `mode='replay'`: no hay canal; el cliente muestra los segmentos con `t_start_ms <= now - started_at`, con un indicador "DEMO – REPLAY".

### 7.6 Recap `/s/[slug]/recap`
- Resumen, ideas clave, capítulos (clic → salta al texto o al video), menciones.
- Transcripción completa con buscador; notas del usuario en la línea de tiempo.
- Exportar notas + resumen a Markdown (descarga o compartir desde el celular con la Web Share API).
- Si hay `video_url` de YouTube: embed con `?start=` según el capítulo o nota.

### 7.7 Simulador `/simulate`
- Lista de sesiones con `audio_url`; botón "Iniciar N" que abre N streamers en la misma pestaña (cada uno con su `AudioContext` silenciado → worklet → Deepgram).
- En celular, probar con 3–5 en paralelo; en escritorio, 10. El resto de la demo se cubre con replay.

### 7.8 Replay `POST /api/replay/import`
1. Recibe `{ sessionId, audioUrl }` (audio en el bucket `demo-audio`).
2. Deepgram pre-grabado: `POST https://api.deepgram.com/v1/listen?model=********&language=..&smart_format=true&utterances=true` con `{ url: audioUrl }`.
3. Cada utterance → segmento con `t_start_ms`/`t_end_ms`.
4. Traducción **por lotes** (20 segmentos por llamada, salida JSON con `seq`).
5. Resumen final y capítulos. Marca la sesión `mode='replay'`, `status='live'`, `started_at=now()`.
- Si la función excede el tiempo máximo, procesar en tramos (`?from=seq`) llamados desde el admin.
- Usar audios con licencia libre (p. ej. charlas CC-BY) y citarlos en el README.

---

## 8. Prompts de LLM

**Traducción** (temperatura 0,2): 2 segmentos anteriores como contexto (no se traducen), el segmento, el glosario. Reglas: traducir solo el segmento; no traducir nombres propios, código, comandos ni siglas; español latinoamericano neutro; frases cortas aptas para subtítulo; devolver solo el texto.

**Insights** (Structured Outputs con el schema `InsightPayload`, temperatura 0,3): segmentos como `[seq|t_ms] texto`. `rolling` = hasta ahora; `final` = toda la charla, en `es` y `en`. Validar que cada `tStartMs` exista y, si no, ajustar al segmento más cercano.

---

## 9. Consideraciones y límites

| Tema | Detalle / mitigación |
|---|---|
| Costo Deepgram | Nova-3 streaming ≈ US$ 0,0048/min (mono) – 0,0058/min (multi). US$ 200 de crédito ≈ 570 h de sala |
| Costo OpenAI | Charla de 45 min ≈ 10k tokens; con contexto de traducción y resúmenes ≈ 100k tokens → centavos con un modelo mini. Poner límite de gasto |
| Supabase Realtime | Free: 200 conexiones, 100 msg/s. Pro sin tope de gasto: 10.000 y 2.500 msg/s. Se cuenta por destinatario → interims en canal aparte, 1/s |
| Vercel | Rutas cortas; `maxDuration` 60 s en summarize y replay (tramos si no alcanza) |
| Celular como estación | Pantalla encendida (Wake Lock), cargador, no cambiar de app, modo avión + wifi si hay llamadas entrantes |
| Micrófono | Solo en HTTPS y en la URL publicada (no en la vista previa de v0) |
| Seguridad | Clave de operador para token y segmentos. P0: canal de interims público (riesgo aceptado en demo); P2: pasar interims por `/api/interim` o canales privados con Realtime Authorization |
| Privacidad | Aviso de que la sala se transcribe; grabación desactivada por defecto |
| Open source | Deepgram y OpenAI son propietarios → `SttProvider` y `LlmProvider` documentados para cambiarlos por alternativas abiertas/locales. Next.js y Supabase se pueden autoalojar |

---

## 10. Plan de 12 horas (un solo "agente": v0, desde el celular)

Sin paralelismo: prompts de v0 **pequeños y en orden**. Publicar después de cada paso que funcione y probar en la URL publicada.

| Hora | Paso | Criterio de aceptación |
|---|---|---|
| 0:00–0:45 | Cuentas: Deepgram (clave con permiso Member), OpenAI (límite de gasto). Proyecto en v0, pegar este plan en instrucciones, conectar Supabase desde v0, cargar variables de entorno | Variables visibles en v0; Supabase conectado |
| 0:45–1:30 | Prompt 1: esquema SQL, RLS, seed (3 salas, 4 sesiones), agenda y admin | La agenda lista las sesiones desde Supabase |
| 1:30–3:30 | Prompts 2–3: estación de sala con fuente micrófono/archivo, AudioWorklet, token, Deepgram, SegmentAssembler, reloj, panel de diagnóstico | Hablar al celular → segmentos con `t_ms` correctos en la tabla (ver panel) |
| 3:30–5:00 | Prompt 4: `/api/segments` + traducción OpenAI + audiencia en tiempo real | En otra pestaña/dispositivo, EN aparece y ES llega ≤ 2 s después |
| **5:00–5:30** | **Checkpoint núcleo** | 15 min estables con una fuente de archivo en inglés |
| 5:30–6:30 | Prompt 5: reconexión, KeepAlive, pausa, Wake Lock | Activar/desactivar wifi → reconecta sin saltos de tiempo |
| 6:30–7:30 | Prompt 6: `/simulate` + `/api/replay/import` | 3–5 salas vivas desde el celular + 5 salas replay en la agenda |
| 7:30–9:00 | Prompt 7: summarize (rolling/final), capítulos, recap | Charla de 20 min → resumen y 5+ capítulos que saltan al punto correcto |
| 9:00–10:00 | Prompt 8: notas y marcadores con Auth anónima, exportar Markdown, embed YouTube con desfase | Marcar 3 momentos en vivo y verlos en el recap |
| 10:00–11:00 | Prompt 9: README, DEPLOY.md, ARCHITECTURE.md, LICENSE; accesibilidad (contraste, tamaño, modo sala). Sincronizar a GitHub público | Repo público con licencia y guía completa |
| 11:00–12:00 | Prueba final, grabar demo con la grabación de pantalla del celular, entrega | Video 2–3 min: agenda → sala en vivo → traducción → nota → recap |

### Recortes si vas atrasado (en orden)
1. Embed de video y desfase. 2. Resumen rolling (solo final). 3. Menciones. 4. Simulador multi-fuente (dejar solo replay). 5. Texto provisorio.

**No se recorta:** varias salas visibles a la vez, EN→ES en vivo, reconexión, guía de despliegue, licencia.

---

## 11. Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=            # las crea la integración de Supabase en v0
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
********=
DEEPGRAM_MODEL=********
OPENAI_API_KEY=
LLM_PROVIDER=********
OPENAI_MODEL_TRANSLATE=              # modelo pequeño vigente (verificar en la doc de OpenAI)
OPENAI_MODEL_SUMMARY=
OPERATOR_KEY=                        # clave para estaciones de sala y admin
INTERIM_THROTTLE_MS=1000
```

---

## 12. Instrucciones para v0 (o cualquier agente)

1. No cambies las decisiones de la sección 2 sin preguntar.
2. Implementa contra los contratos de la sección 6. Si hace falta un campo nuevo, cambia `lib/schemas.ts` y agrega un script SQL nuevo.
3. Haz solo lo que pide cada prompt; no reescribas archivos que no se mencionan.
4. Prioriza robustez en vivo: reconexión, idempotencia y marcas de tiempo correctas por sobre animaciones.
5. Toda ruta API valida con zod, usa service role solo en servidor y registra errores en `logs`.
6. Confirma en la documentación oficial los parámetros y nombres de modelo vigentes antes de usarlos.

### Referencias
- Deepgram streaming: https://developers.deepgram.com/docs/stt-streaming-feature-overview
- Endpointing e interim: https://developers.deepgram.com/docs/understand-endpointing-interim-results
- KeepAlive: https://developers.deepgram.com/docs/audio-keep-alive
- Finalize: https://developers.deepgram.com/docs/finalize
- Keyterm: https://developers.deepgram.com/docs/keyterm
- Tokens temporales: https://developers.deepgram.com/guides/fundamentals/token-based-authentication
- Supabase Realtime límites: https://supabase.com/docs/guides/realtime/limits
- Supabase Auth anónima: https://supabase.com/docs/guides/auth/auth-anonymous

---

## Anexo A — Prompts para v0, en orden

Pega uno por vez. Espera a que funcione, publica y prueba antes del siguiente.

**P1 — Base de datos y agenda**
> Lee PLAN.md (secciones 4, 5 y 6). Crea `scripts/001_schema.sql`, `002_rls.sql` y `003_seed.sql` exactamente con el modelo de la sección 5 (3 salas, 4 sesiones: 2 en inglés, 2 en español) y ejecútalos en Supabase. Crea `lib/schemas.ts` con los contratos de la sección 6 usando zod. Crea la página `/` (agenda: salas con su sesión actual, estado y botón "Ver subtítulos" con selector de idioma) y `/admin` protegida por `OPERATOR_KEY` para crear salas y sesiones. Mobile first, modo oscuro.

**P2 — Token y audio**
> Implementa según PLAN.md 7.1 pasos 1–5: `/api/stt/token` (POST a Deepgram `/v1/auth/grant`, protegido con `x-operator-key`), `/api/sessions/[id]/start`, `lib/stt/pcm-worklet.ts` (AudioWorklet que convierte a Int16 16 kHz mono, frames de 100 ms), `lib/stt/deepgram.ts` implementando `SttProvider` de la sección 9. Página `/stage/[stageId]` con: clave de operador, selector de sesión, fuente (micrófono o URL de audio), botón Iniciar/Pausar/Finalizar, vúmetro y panel de diagnóstico que muestre los eventos crudos de Deepgram. Aún no guardes segmentos.

**P3 — Segmentos y reloj**
> Implementa `lib/stt/segment-assembler.ts` según PLAN.md 7.1 paso 6 y 7.2 (reloj de sesión con `connectionOffsetMs`, concatenar `is_final` hasta `speech_final`/`UtteranceEnd`, corte a 20 s/250 caracteres). Implementa `POST /api/segments` según 7.4 pasos 1–2 (sin traducción todavía) con upsert idempotente por `(session_id, seq)` y broadcast `segment` en `live:{sessionId}`. Envía interims con throttle de 1 s a `live:{sessionId}:interim`. Muestra en el panel: segmentos enviados, fallidos, latencia y deriva.

**P4 — Traducción y audiencia**
> Implementa `lib/llm/provider.ts` y `lib/llm/********.ts` (`translate` según PLAN.md sección 8). Completa `/api/segments` con 7.4 pasos 3–4. Crea `/s/[slug]` según 7.5 (sin notas todavía): historial + suscripción Realtime, 2–3 líneas grandes, "Volver al vivo", selector de idioma, tamaño de letra, alto contraste, modo pantalla de sala, interruptor de texto provisorio.

**P5 — Robustez**
> Implementa PLAN.md 7.1 pasos 7, 8, 10 y 11, y 7.3 completo: KeepAlive como frame de texto, Pausa con Finalize/CloseStream, Finalizar, reconexión con backoff y token nuevo, cola con reintentos para `/api/segments`, Wake Lock y banner RECONECTANDO. Registra errores en la tabla `logs`.

**P6 — Simulador y replay**
> Implementa `/simulate` según 7.7 y `/api/replay/import` según 7.8 (Deepgram pre-grabado con `utterances=true`, traducción por lotes de 20, sesión `mode='replay'`). En `/admin` agrega subir audio al bucket público `demo-audio` y el botón "Importar replay". En `/s/[slug]`, soporta `mode='replay'` revelando segmentos según `now - started_at` con indicador DEMO.

**P7 — Insights y recap**
> Implementa `/api/sessions/[id]/summarize` y `/close` con Structured Outputs y el schema `InsightPayload` (sección 8), en `es` y `en`, validando `tStartMs`. La estación llama rolling cada 5 min y final al cerrar. Crea `/s/[slug]/recap` según 7.6 (sin notas todavía): resumen, ideas, capítulos que saltan al texto, transcripción con buscador.

**P8 — Notas**
> Activa Auth anónima de Supabase. En `/s/[slug]` agrega botones Marcar y Nota que guardan en `notes` con el `t_ms` actual (RLS: solo el dueño). En el recap, muestra las notas en la línea de tiempo, exporta notas + resumen a Markdown (descarga y Web Share API) y, si hay `video_url` de YouTube, embed con `?start=` y ajuste de `video_offset_ms`.

**P9 — Open source y pulido**
> Agrega `LICENSE` (Apache-2.0), `README.md` (qué es, capturas, demo, créditos de audios CC), `docs/DEPLOY.md` (paso a paso: cuentas Deepgram/OpenAI/Supabase, variables, scripts SQL, deploy en Vercel, cómo operar una sala desde un celular, costos estimados) y `docs/ARCHITECTURE.md` (sección 3 y cómo cambiar `SttProvider`/`LlmProvider`). Revisa accesibilidad de `/s/[slug]`: contraste AA, tamaños táctiles de 44 px, `aria-live="polite"` en los subtítulos.
