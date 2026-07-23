import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || ''
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
      // A verified Supabase identity that may not yet have a household profile.
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

// --- Supabase Auth token (owner) ---
export function verifySupabaseToken(token: string): { authId: string; email: string } | null {
  if (!SUPABASE_JWT_SECRET) return null
  try {
    const d = jwt.verify(token, SUPABASE_JWT_SECRET) as jwt.JwtPayload
    if (!d.sub) return null
    return { authId: d.sub as string, email: (d.email as string) || '' }
  } catch {
    return null
  }
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization
  return header?.startsWith('Bearer ') ? header.slice(7) : null
}

/**
 * Resolve the caller. Accepts either a staff-tablet token or a Supabase owner
 * token. For owners we look up the household profile lazily (see resolveOwner).
 */
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
  const sb = verifySupabaseToken(token)
  if (!sb) {
    res.status(401).json({ error: 'Session expired — please sign in again' })
    return
  }
  req.supabaseUser = sb

  // Lazily import to avoid a cycle; resolve the owner's household profile.
  const { prisma } = await import('./db.js')
  const user = await prisma.user.findUnique({ where: { authId: sb.authId } })
  if (!user) {
    // Authenticated with Supabase but no household yet — only /auth routes allow this.
    req.auth = { role: 'owner', householdId: '', authId: sb.authId, email: sb.email }
  } else {
    req.auth = { role: 'owner', householdId: user.householdId, authId: sb.authId, email: sb.email }
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
