import { Router } from 'express'
import { z } from 'zod'
import { customAlphabet } from 'nanoid'
import { prisma } from '../db.js'
import { signToken, hashPassword, comparePassword, requireAuth } from '../auth.js'

export const authRouter = Router()

// Human-friendly join codes: no ambiguous chars (0/O, 1/I).
const makeJoinCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6)

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  householdName: z.string().min(1),
})

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid details', details: parsed.error.flatten() })
    return
  }
  const { email, password, name, householdName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' })
    return
  }

  // Ensure a unique join code.
  let joinCode = makeJoinCode()
  while (await prisma.household.findUnique({ where: { joinCode } })) {
    joinCode = makeJoinCode()
  }

  const household = await prisma.household.create({ data: { name: householdName, joinCode } })
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      name,
      householdId: household.id,
    },
  })

  const token = signToken({ householdId: household.id, role: 'owner', userId: user.id })
  res.json({
    token,
    role: 'owner',
    user: { id: user.id, name: user.name, email: user.email },
    household: { id: household.id, name: household.name, joinCode: household.joinCode },
  })
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid details' })
    return
  }
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { household: true },
  })
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Wrong email or password' })
    return
  }

  const token = signToken({ householdId: user.householdId, role: 'owner', userId: user.id })
  res.json({
    token,
    role: 'owner',
    user: { id: user.id, name: user.name, email: user.email },
    household: { id: user.household.id, name: user.household.name, joinCode: user.household.joinCode },
  })
})

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

  const token = signToken({ householdId: household.id, role: 'tablet' })
  res.json({
    token,
    role: 'tablet',
    household: { id: household.id, name: household.name, joinCode: household.joinCode },
  })
})

authRouter.get('/me', requireAuth, async (req, res) => {
  const { householdId, role, userId } = req.auth!
  const household = await prisma.household.findUnique({ where: { id: householdId } })
  if (!household) {
    res.status(404).json({ error: 'Household not found' })
    return
  }
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
  res.json({
    role,
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    household: { id: household.id, name: household.name, joinCode: household.joinCode },
  })
})
