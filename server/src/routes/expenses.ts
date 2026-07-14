import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'

export const expensesRouter = Router()

expensesRouter.use(requireAuth)

const createSchema = z.object({
  amount: z.coerce.number().int().min(0),
  description: z.string().min(1),
  category: z.enum(['Groceries', 'Household', 'Utilities', 'Other']).default('Groceries'),
  date: z.string().min(1),
  staffId: z.string().nullable().optional(),
})

// Owner or staff (tablet) can log petty-cash spend.
expensesRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid expense' })
    return
  }
  const householdId = req.auth!.householdId
  const data = parsed.data
  if (data.staffId) {
    const staff = await prisma.staff.findFirst({ where: { id: data.staffId, householdId } })
    if (!staff) {
      res.status(404).json({ error: 'Staff not found' })
      return
    }
  }
  const expense = await prisma.expense.create({
    data: {
      householdId,
      amount: data.amount,
      description: data.description,
      category: data.category,
      date: data.date,
      staffId: data.staffId || null,
    },
  })
  broadcast(householdId)
  res.json(expense)
})

expensesRouter.delete('/:id', requireOwner, async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.expense.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Expense not found' })
    return
  }
  await prisma.expense.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
