import { Router } from 'express'
import { z } from 'zod'
import { customAlphabet } from 'nanoid'
import { prisma } from '../db.js'
import { requireAuth, signTabletToken } from '../auth.js'

export const authRouter = Router()

// Human-friendly join codes: no ambiguous chars (0/O, 1/I).
const makeJoinCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

// --- Staff tablet: exchange a household join code for a scoped tablet token ---
const tabletSchema = z.object({ joinCode: z.string().min(1) })

authRouter.post('/tablet', async (req, res) => {
  const parsed = tabletSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a join code' })
    return
  }
  const joinCode = parsed.data.joinCode.trim().toUpperCase()
  const household = await prisma.household.findUnique({ where: { joinCode } })
  if (!household) {
    res.status(404).json({ error: 'No home found for that code' })
    return
  }
  res.json({
    token: signTabletToken(household.id),
    role: 'tablet',
    household: { id: household.id, name: household.name, joinCode: household.joinCode },
  })
})

// --- Owner: create the household on first sign-in (after Supabase sign-up) ---
const bootstrapSchema = z.object({
  name: z.string().min(1),
  householdName: z.string().min(1),
})

authRouter.post('/bootstrap', requireAuth, async (req, res) => {
  const sb = req.supabaseUser
  if (!sb) {
    res.status(401).json({ error: 'Sign in first' })
    return
  }

  // Already set up? Return the existing profile (idempotent).
  const existing = await prisma.user.findUnique({
    where: { authId: sb.authId },
    include: { household: true },
  })
  if (existing) {
    res.json({
      role: 'owner',
      user: { id: existing.id, name: existing.name, email: existing.email },
      household: {
        id: existing.household.id,
        name: existing.household.name,
        joinCode: existing.household.joinCode,
      },
    })
    return
  }

  const parsed = bootstrapSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Your name and a household name are required' })
    return
  }

  let joinCode = makeJoinCode()
  while (await prisma.household.findUnique({ where: { joinCode } })) joinCode = makeJoinCode()

  const household = await prisma.household.create({ data: { name: parsed.data.householdName, joinCode } })
  const user = await prisma.user.create({
    data: { authId: sb.authId, email: sb.email, name: parsed.data.name, householdId: household.id },
  })
  // New households start empty — the owner adds their own staff, tasks, etc.

  res.json({
    role: 'owner',
    user: { id: user.id, name: user.name, email: user.email },
    household: { id: household.id, name: household.name, joinCode: household.joinCode },
  })
})

// --- Current session context ---
authRouter.get('/me', requireAuth, async (req, res) => {
  const auth = req.auth!

  if (auth.role === 'tablet') {
    const household = await prisma.household.findUnique({ where: { id: auth.householdId } })
    if (!household) {
      res.status(404).json({ error: 'Household not found' })
      return
    }
    res.json({
      role: 'tablet',
      user: null,
      household: { id: household.id, name: household.name, joinCode: household.joinCode },
    })
    return
  }

  // Owner
  const user = await prisma.user.findUnique({ where: { authId: auth.authId! }, include: { household: true } })
  if (!user) {
    res.json({ role: 'owner', needsBootstrap: true })
    return
  }
  res.json({
    role: 'owner',
    user: { id: user.id, name: user.name, email: user.email },
    household: { id: user.household.id, name: user.household.name, joinCode: user.household.joinCode },
  })
})
