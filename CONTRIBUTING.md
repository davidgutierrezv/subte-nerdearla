# Cómo contribuir a Subte

Gracias por querer ayudar. Subte busca que cualquier conferencia pueda tener subtítulos en vivo sin depender de herramientas caras.

## Correr el proyecto

Requisitos: Node.js 20 o superior y [pnpm](https://pnpm.io).

1. Cloná el repositorio:

   ```bash
   git clone https://github.com/davidgutierrezv/subte-nerdearla.git
   cd subte-nerdearla
   ```

2. Instalá dependencias:

   ```bash
   pnpm install
   ```

3. Creá un proyecto de Supabase y ejecutá `scripts/001_schema.sql`, `scripts/002_rls.sql` y `scripts/003_seed.sql` en ese orden (ver [docs/DEPLOY.md](docs/DEPLOY.md)).
4. Copiá `.env.example` a `.env.local` y completá los valores.
5. Levantá el servidor de desarrollo:

   ```bash
   pnpm dev
   ```

   Abrí http://localhost:3000.

## Convenciones de código

- **TypeScript estricto.** Evitá `any`.
- **Tiempos en milisegundos enteros**, con sufijo `Ms` en TypeScript (`tStartMs`) y `_ms` en la base de datos (`t_start_ms`).
- **Contratos compartidos en `lib/schemas.ts`.** Todo evento, cuerpo de API o salida de LLM se define ahí con zod y se valida en el borde (Server Actions, rutas API).
- **Secretos solo en el servidor.** `SUPABASE_SERVICE_ROLE_KEY`, `OPERATOR_KEY` y futuras claves de proveedores nunca se importan en componentes cliente ni se exponen con el prefijo `NEXT_PUBLIC_`. `lib/supabase/admin.ts` se usa solo desde código de servidor.
- **Textos de la interfaz en `lib/i18n/`.** No escribas textos directamente en los componentes; agregalos en `es.ts` y `en.ts`.
- **Accesibilidad:** HTML semántico, áreas táctiles de 44 px, contraste AA y formularios que funcionen sin JavaScript cuando se pueda.
- **Cambios de base de datos:** agregá un script nuevo numerado en `scripts/` (por ejemplo, `004_...sql`) en lugar de editar los existentes, y mantené RLS activo en toda tabla nueva.
- **Diseño:** seguí [docs/BRAND.md](docs/BRAND.md).

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/):

```
feat: agregar vista de público de la charla
fix: corregir orden de sesiones en la agenda
docs: actualizar guía de despliegue
refactor: extraer cliente de Deepgram
chore: actualizar dependencias
```

## Pull requests

1. Creá una rama desde `main` (`feat/…`, `fix/…`, `docs/…`).
2. Mantené el PR chico y enfocado en un solo cambio.
3. Describí qué cambia, por qué y cómo probarlo.
4. Si cambiás rutas, tablas o variables de entorno, actualizá la documentación de `docs/` y `.env.example`.

## Proponer un proveedor nuevo

Subte está pensado para intercambiar proveedores de transcripción y de LLM (interfaces `SttProvider` y `LlmProvider`, planificadas).

1. Abrí un issue con el proveedor, su licencia, costo aproximado, latencia e idiomas soportados.
2. El proveedor de transcripción debe producir frases que cumplan `SegmentInSchema`; el de LLM, traducciones por idioma y resúmenes que cumplan `InsightPayloadSchema` (ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#cómo-agregar-un-proveedor-nuevo-planificado)).
3. Priorizamos alternativas abiertas o que se puedan correr localmente (Whisper, Ollama, etc.).

## Licencia

Al contribuir aceptás que tu aporte se publique bajo la [Apache License 2.0](LICENSE).
