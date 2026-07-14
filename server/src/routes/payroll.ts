import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const payrollRouter = Router()

payrollRouter.use(requireAuth, requireOwner)

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// Set an advance for a staff member this month; net recomputes.
const advanceSchema = z.object({
  staffId: z.string().min(1),
  advance: z.coerce.number().int().min(0),
  month: z.string().optional(),
})

payrollRouter.post('/advance', async (req, res) => {
  const parsed = advanceSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid advance' })
    return
  }
  const householdId = req.auth!.householdId
  const month = parsed.data.month || currentMonth()
  const staff = await prisma.staff.findFirst({ where: { id: parsed.data.staffId, householdId } })
  if (!staff) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }
  const net = Math.max(0, staff.salary - parsed.data.advance)
  const row = await prisma.payroll.upsert({
    where: { staffId_month: { staffId: staff.id, month } },
    create: {
      householdId,
      staffId: staff.id,
      month,
      base: staff.salary,
      advance: parsed.data.advance,
      net,
      status: 'Scheduled',
    },
    update: { advance: parsed.data.advance, net, base: staff.salary },
  })
  broadcast(householdId)
  res.json(row)
})

// Mark the whole month's payroll as paid (creates rows as needed).
const paySchema = z.object({ month: z.string().optional() })

payrollRouter.post('/pay', async (req, res) => {
  const parsed = paySchema.safeParse(req.body)
  const householdId = req.auth!.householdId
  const month = parsed.success && parsed.data.month ? parsed.data.month : currentMonth()

  const staff = await prisma.staff.findMany({ where: { householdId } })
  for (const s of staff) {
    const existing = await prisma.payroll.findUnique({
      where: { staffId_month: { staffId: s.id, month } },
    })
    const advance = existing?.advance ?? 0
    await prisma.payroll.upsert({
      where: { staffId_month: { staffId: s.id, month } },
      create: {
        householdId,
        staffId: s.id,
        month,
        base: s.salary,
        advance,
        net: Math.max(0, s.salary - advance),
        status: 'Paid',
        paidAt: new Date(),
      },
      update: { status: 'Paid', paidAt: new Date(), base: s.salary, net: Math.max(0, s.salary - advance) },
    })
  }
  await notify(householdId, `Payroll for ${month} marked as paid`)
  broadcast(householdId)
  res.json({ ok: true })
})
