# Desplegar Subte en tu conferencia

Esta guía es para alguien que nunca vio el proyecto. Al final vas a tener la agenda pública y el panel de operadores funcionando en tu propio Vercel y tu propio Supabase.

> **Alcance actual:** la versión de hoy incluye la agenda (`/`) y el panel de operadores (`/admin`). La transcripción en vivo (Deepgram), la traducción (OpenAI) y la estación de sala están en el [Roadmap](../README.md#roadmap). Las secciones marcadas _(planificado)_ describen la configuración que van a necesitar.

## 1. Requisitos

| Servicio | Para qué | Necesario hoy |
|---|---|---|
| [GitHub](https://github.com) | Hacer el fork del código | Sí |
| [Vercel](https://vercel.com) | Alojar la aplicación | Sí |
| [Supabase](https://supabase.com) | Base de datos | Sí |
| [Deepgram](https://deepgram.com) | Transcripción en vivo (clave con permiso **Member** o superior) | No _(planificado)_ |
| [OpenAI](https://platform.openai.com) | Traducción y resúmenes (configurá un **límite de gasto**) | No _(planificado)_ |

## 2. Fork del repositorio

Entrá a [github.com/davidgutierrezv/subte-nerdearla](https://github.com/davidgutierrezv/subte-nerdearla) y hacé clic en **Fork**.

## 3. Crear el proyecto de Supabase

1. Creá un proyecto nuevo en Supabase. Elegí la región más cercana a tu conferencia.
2. Abrí **SQL Editor** y ejecutá los scripts de `scripts/` **en este orden**:
   1. `scripts/001_schema.sql`: crea las tablas `stages`, `sessions`, `segments`, `translations`, `session_insights`, `notes` y `logs`.
   2. `scripts/002_rls.sql`: activa Row Level Security y crea las políticas.
   3. `scripts/003_seed.sql` _(opcional)_: carga 3 salas y 4 sesiones de ejemplo. Saltealo en producción.
3. _(Planificado)_ Activá **Authentication > Sign In / Providers > Anonymous Sign-Ins**. Lo van a usar las notas personales.
4. Por ahora no hace falta crear buckets de Storage: el código actual no los usa.

## 4. Importar en Vercel y cargar variables

1. En Vercel, **Add New > Project** e importá tu fork.
2. En **Environment Variables**, cargá:

| Variable | Dónde se obtiene | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` / publishable key | No (limitada por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` key | **Sí** |
| `OPERATOR_KEY` | La generás vos (ver abajo) | **Sí** |

También podés conectar Supabase desde el **Marketplace de Vercel**; en ese caso las variables de Supabase se cargan solas.

**Cómo crear una `OPERATOR_KEY` segura:**

```bash
openssl rand -base64 32
```

Compartila solo con las personas que operan las salas, por un canal privado. Si se filtra, cambiala en Vercel y volvé a desplegar: las sesiones de operador existentes quedan invalidadas porque la cookie se deriva de la clave.

Referencia completa en [`.env.example`](../.env.example).

## 5. Desplegar y verificar

Hacé clic en **Deploy**. Cuando termine, revisá:

- [ ] La agenda (`/`) carga y muestra las salas (o el mensaje de agenda vacía si no cargaste datos de ejemplo).
- [ ] `/admin` pide la clave de operador y rechaza una clave incorrecta.
- [ ] Con la clave correcta podés crear una sala y aparece en la agenda.
- [ ] _(Planificado)_ La estación de sala conecta y el vúmetro se mueve.
- [ ] _(Planificado)_ Un subtítulo aparece en la vista de público.

## 6. Crear las salas y sesiones de tu conferencia

1. Entrá a `/admin` con tu `OPERATOR_KEY`.
2. Creá una sala por escenario (por ejemplo, "Sala Principal"). Cada sala toma un color de línea automáticamente (A amarillo, B azul, C rojo, D verde, y se repiten).
3. Creá cada sesión con:
   - **Sala**.
   - **Slug**: minúsculas, números y guiones (por ejemplo, `open-source-at-scale`). Es la URL de la charla y debe ser único.
   - **Título** y **orador**.
   - **Idioma original**: `en` o `es`. La sesión se ofrece en español e inglés.
   - **Glosario**: términos separados por coma (nombres de productos, siglas) para mejorar la transcripción.

Las sesiones se crean con estado `scheduled`.

## 7. Escalar a una conferencia grande

- **Supabase:** el plan Free admite 200 conexiones de Realtime y 100 mensajes por segundo. Para una conferencia con cientos de asistentes conectados a la vez, usá **Pro** y desactivá el tope de gasto (10.000 conexiones, 2.500 mensajes por segundo). Supabase cuenta cada mensaje por destinatario.
- **Deepgram** _(planificado)_: pay-as-you-go admite hasta 150 WebSockets simultáneos; alcanza para 150 salas.
- **Costos:** ver la tabla del [README](../README.md#costos-estimados). Ejemplo: 10 salas × 8 h × 3 días ≈ US$ 80 de transcripción.

## 8. Autoalojamiento

- **Aplicación:** es un proyecto Next.js estándar. En cualquier servidor con Node.js 20 o superior:

  ```bash
  pnpm install
  pnpm build
  pnpm start
  ```

  Cargá las mismas variables de entorno y serví detrás de HTTPS (el micrófono del navegador exige HTTPS).
- **Base de datos:** podés usar [Supabase self-hosted](https://supabase.com/docs/guides/self-hosting) y ejecutar los mismos scripts de `scripts/`.

## 9. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| La agenda muestra un error | Faltan las variables de Supabase o no se ejecutaron los scripts | Revisá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`; ejecutá `001` y `002` |
| `/admin` dice que no está configurado | Falta `OPERATOR_KEY` | Cargala en Vercel y volvé a desplegar |
| No se pueden crear salas o sesiones | Falta `SUPABASE_SERVICE_ROLE_KEY` | Cargala en Vercel y volvé a desplegar |
| "El slug ya existe" | Otra sesión usa ese slug | Elegí otro |
| _(Planificado)_ El micrófono está bloqueado | La página no se sirve por HTTPS o es una vista previa embebida | Abrí la URL publicada (`https://…`) directamente y aceptá el permiso |
| _(Planificado)_ Error `NET-0001` de Deepgram | El WebSocket no recibió audio a tiempo o la red lo cortó | Revisá la conexión; la estación reconecta con un token nuevo |
| _(Planificado)_ Los subtítulos no llegan | Realtime no conecta o se superó el límite del plan | Revisá el plan de Supabase y los límites de la sección 7 |
| _(Planificado)_ No aparece la traducción | Falta la clave de OpenAI o se alcanzó el límite de gasto | Revisá la clave y el límite en OpenAI |
