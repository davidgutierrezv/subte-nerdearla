import { createGateway } from 'ai'

// Free-tier Gateway accounts can't use newer Gemini models; 2.5 Flash Lite is available and fast.
export const FAST_MODEL = 'google/gemini-2.5-flash-lite'

// Without an explicit key the gateway falls back to AI_GATEWAY_API_KEY / OIDC.
export const gateway = createGateway(
  process.env.VERCEL_AI_GATEWAY_KEY ? { apiKey: process.env.VERCEL_AI_GATEWAY_KEY } : {},
)
