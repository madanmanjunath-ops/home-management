import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader, decodeJwt, type JWTPayload } from 'jose'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const TABLET_JWT_SECRET = process.env.TABLET_JWT_SECRET || 'griha-dev-tablet-secret'

export type Role = 'owner' | 'tablet'

export interface AuthContext {
  role: Role
  householdId: string // resolved for tablet; may be empty for a not-yet-bootstrapped owner
  authId?: string // Supabase auth user id (owner only)
  email?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext
      supabaseUser?: { authId: string; email: string }
    }
  }
}

// --- Staff tablet token (issued by us after a valid join code) ---
export function signTabletToken(householdId: string): string {
  return jwt.sign({ householdId, role: 'tablet' }, TABLET_JWT_SECRET, { expiresIn: '90d' })
}

function verifyTabletToken(token: string): { householdId: string } | null {
  try {
    const d = jwt.verify(token, TABLET_JWT_SECRET) as jwt.JwtPayload
    if (d.role !== 'tablet' || !d.householdId) return null
    return { householdId: d.householdId as string }
  } catch {
    return null
  }
}

// --- Supabase Auth token verification ---
// Supabase projects may sign auth JWTs either with the legacy shared secret
// (HS256) or with asymmetric signing keys (ES256/RS256). We support both.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks && SUPABASE_URL) {
    jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  }
  return jwks
}

function fromPayload(payload: JWTPayload): { authId: string; email: string } | null {
  if (!payload.sub) return null
  return { authId: payload.sub, email: (payload.email as string) || '' }
}

export async function verifySupabaseToken(token: string): Promise<{ authId: string; email: string } | null> {
  // 1) Legacy HS256 shared secret.
  if (SUPABASE_JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET))
      const r = fromPayload(payload)
      if (r) return r
    } catch {
      /* fall through to JWKS */
    }
  }
  // 2) Asymmetric keys via the project's JWKS.
  const set = getJwks()
  if (set) {
    try {
      const { payload } = await jwtVerify(token, set)
      const r = fromPayload(payload)
      if (r) return r
    } catch {
      /* invalid */
    }
  }
  return null
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/**
 * Non-sensitive diagnostics for a caller's token (temporary support tool).
 * Reports which verification paths were attempted and why they failed — never
 * returns secrets or the token itself.
 */
export async function diagnoseToken(req: Request) {
  const token = readBearer(req)
  const report: Record<string, unknown> = {
    env: {
      hasSecret: !!SUPABASE_JWT_SECRET,
      hasSupabaseUrl: !!SUPABASE_URL,
      supabaseUrlHost: SUPABASE_URL ? new URL(SUPABASE_URL).host : null,
    },
  }
  if (!token) {
    report.token = { present: false }
    return report
  }

  let header: Record<string, unknown> = {}
  let payload: JWTPayload = {}
  try {
    header = decodeProtectedHeader(token) as Record<string, unknown>
  } catch {
    /* ignore */
  }
  try {
    payload = decodeJwt(token)
  } catch {
    /* ignore */
  }
  report.token = { present: true, alg: header.alg, kid: header.kid, iss: payload.iss, hasSub: !!payload.sub }

  // HS256 attempt
  if (SUPABASE_JWT_SECRET) {
    try {
      await jwtVerify(token, new TextEncoder().encode(SUPABASE_JWT_SECRET))
      report.hs256 = 'ok'
    } catch (e) {
      report.hs256 = 'error: ' + (e as Error).message
    }
  } else {
    report.hs256 = 'no-secret-set'
  }

  // JWKS (asymmetric) attempt
  const jwksUrl = SUPABASE_URL ? `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` : null
  const jwksReport: Record<string, unknown> = { url: jwksUrl }
  if (jwksUrl) {
    try {
      const r = await fetch(jwksUrl)
      jwksReport.fetchStatus = r.status
      const body = (await r.json().catch(() => null)) as { keys?: unknown[] } | null
      jwksReport.keyCount = body?.keys?.length ?? 0
    } catch (e) {
      jwksReport.fetchError = (e as Error).message
    }
    const set = getJwks()
    if (set) {
      try {
        await jwtVerify(token, set)
        jwksReport.verify = 'ok'
      } catch (e) {
        jwksReport.verify = 'error: ' + (e as Error).message
      }
    }
  } else {
    jwksReport.note = 'SUPABASE_URL not set'
  }
  report.jwks = jwksReport
  return report
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readBearer(req)
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }

  // Try tablet token first (cheap, our own secret).
  const tablet = verifyTabletToken(token)
  if (tablet) {
    req.auth = { role: 'tablet', householdId: tablet.householdId }
    next()
    return
  }

  // Otherwise treat it as a Supabase owner token.
  const sb = await verifySupabaseToken(token)
  if (!sb) {
    res.status(401).json({ error: 'Session expired — please sign in again' })
    return
  }
  req.supabaseUser = sb

  const { prisma } = await import('./db.js')
  const user = await prisma.user.findUnique({ where: { authId: sb.authId } })
  req.auth = {
    role: 'owner',
    householdId: user?.householdId ?? '',
    authId: sb.authId,
    email: sb.email,
  }
  next()
}

/** Require an owner who has completed household setup. */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' })
    return
  }
  if (!req.auth.householdId) {
    res.status(409).json({ error: 'Household not set up yet', needsBootstrap: true })
    return
  }
  next()
}

/** Any authenticated caller must belong to a household (blocks un-bootstrapped owners). */
export function requireHousehold(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || !req.auth.householdId) {
    res.status(409).json({ error: 'Household not set up yet', needsBootstrap: true })
    return
  }
  next()
}
