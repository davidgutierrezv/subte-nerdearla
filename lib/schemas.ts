import { z } from 'zod'

export const LangSchema = z.enum(['en', 'es'])
export type Lang = z.infer<typeof LangSchema>
export const LANGS = LangSchema.options

const msSchema = z.number().int().nonnegative()
const seqSchema = z.number().int().nonnegative()

// Canal live:{sessionId} (Broadcast)
export const SegmentEventSchema = z.object({
  type: z.literal('segment'),
  id: z.uuid(),
  seq: seqSchema,
  lang: LangSchema,
  text: z.string().min(1),
  tStartMs: msSchema,
  tEndMs: msSchema,
})

export const TranslationEventSchema = z.object({
  type: z.literal('translation'),
  segmentId: z.uuid(),
  seq: seqSchema,
  lang: LangSchema,
  text: z.string().min(1),
})

export const InsightEventSchema = z.object({
  type: z.literal('insight'),
  kind: z.enum(['rolling', 'final']),
})

export const StatusEventSchema = z.object({
  type: z.literal('status'),
  status: z.enum(['live', 'paused', 'ended']),
})

// Texto provisorio: se reemplaza en cada evento y desaparece al llegar el segmento final.
export const InterimEventSchema = z.object({
  type: z.literal('interim'),
  lang: LangSchema,
  text: z.string().max(2000),
  tStartMs: msSchema,
})
export type InterimEvent = z.infer<typeof InterimEventSchema>

// El operador borró la transcripción (pruebas).
export const ResetEventSchema = z.object({ type: z.literal('reset') })

export const LiveEventSchema = z.discriminatedUnion('type', [
  SegmentEventSchema,
  TranslationEventSchema,
  InsightEventSchema,
  StatusEventSchema,
  InterimEventSchema,
  ResetEventSchema,
])
export type LiveEvent = z.infer<typeof LiveEventSchema>

// POST /api/segments (header: x-operator-key)
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
  .refine((s) => s.tEndMs >= s.tStartMs, {
    message: 'tEndMs must be >= tStartMs',
    path: ['tEndMs'],
  })
export type SegmentIn = z.infer<typeof SegmentInSchema>

// Salida del LLM (Structured Outputs + validación zod; 1 reintento)
export const InsightPayloadSchema = z.object({
  summary: z.string().min(1),
  keyIdeas: z.array(z.string().min(1)).max(7),
  chapters: z.array(z.object({ tStartMs: msSchema, title: z.string().min(1) })),
  mentions: z.array(
    z.object({
      name: z.string().min(1),
      kind: z.enum(['tool', 'project', 'person', 'concept']),
      url: z.url().optional(),
    }),
  ),
})
export type InsightPayload = z.infer<typeof InsightPayloadSchema>

// Filas de base de datos usadas por la UI
export const SessionStatusSchema = z.enum(['scheduled', 'live', 'ended'])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

export type StageRow = { id: string; name: string }

export type SessionRow = {
  id: string
  stage_id: string | null
  slug: string
  title: string
  speaker: string | null
  source_lang: Lang
  target_langs: Lang[]
  glossary: string[] | null
  mode: 'live' | 'replay'
  status: SessionStatus
  started_at: string | null
  ended_at: string | null
}

// Formularios de /admin
export const StageInSchema = z.object({
  name: z.string().trim().min(2).max(80),
})

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const SessionInSchema = z.object({
  stageId: z.uuid(),
  slug: z.string().trim().min(3).max(80).regex(SLUG_PATTERN),
  title: z.string().trim().min(3).max(200),
  speaker: z.string().trim().max(120).optional(),
  sourceLang: LangSchema,
  glossary: z.array(z.string().trim().min(1).max(60)).max(100),
})
export type SessionIn = z.infer<typeof SessionInSchema>

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } }
