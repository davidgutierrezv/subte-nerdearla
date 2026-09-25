import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'sc_operator'
const COOKIE_MAX_AGE_S = 60 * 60 * 12

function sha256(value: string) {
  return createHash('sha256').update(value).digest()
}

// Hashing both sides gives equal-length buffers, so timingSafeEqual never throws.
function safeEqual(a: string, b: string) {
  return timingSafeEqual(sha256(a), sha256(b))
}

export function isOperatorConfigured() {
  return Boolean(process.env.OPERATOR_KEY)
}

export function isValidOperatorKey(key: string | null | undefined) {
  const expected = process.env.OPERATOR_KEY
  if (!expected || !key) return false
  return safeEqual(key, expected)
}

// The cookie holds an HMAC derived from the key, never the key itself.
function sessionToken() {
  const expected = process.env.OPERATOR_KEY
  if (!expected) return null
  return createHmac('sha256', expected).update('stagecaptions-operator-session').digest('hex')
}

export async function hasOperatorSession() {
  const token = sessionToken()
  if (!token) return false
  const value = (await cookies()).get(COOKIE_NAME)?.value
  return Boolean(value) && safeEqual(value!, token)
}

export async function startOperatorSession() {
  const token = sessionToken()
  if (!token) return
  ;(await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_S,
  })
}

export async function endOperatorSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}
