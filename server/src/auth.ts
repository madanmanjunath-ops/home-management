import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'griha-dev-secret'

export type Role = 'owner' | 'tablet'

export interface AuthContext {
  householdId: string
  role: Role
  userId?: string
}

// Extend Express Request with our auth context.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext
    }
  }
}

export function signToken(ctx: AuthContext): string {
  return jwt.sign(ctx, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): AuthContext | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    if (!decoded.householdId || !decoded.role) return null
    return {
      householdId: decoded.householdId as string,
      role: decoded.role as Role,
      userId: decoded.userId as string | undefined,
    }
  } catch {
    return null
  }
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10)
}

export async function comparePassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash)
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

/** Require any valid session (owner or tablet). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readBearer(req)
  const ctx = token ? verifyToken(token) : null
  if (!ctx) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  req.auth = ctx
  next()
}

/** Require an owner session (management actions). */
export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== 'owner') {
    res.status(403).json({ error: 'Owner access required' })
    return
  }
  next()
}
