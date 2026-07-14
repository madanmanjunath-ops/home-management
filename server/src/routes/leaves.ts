import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const leavesRouter = Router()

leavesRouter.use(requireAuth)

const createSchema = z.object({
  staffId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
})

// Owner or staff (tablet) can file a leave request.
leavesRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid leave request' })
    return
  }
  const householdId = req.auth!.householdId
  const staff = await prisma.staff.findFirst({ where: { id: parsed.data.staffId, householdId } })
  if (!staff) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }
  const leave = await prisma.leave.create({ data: { ...parsed.data, householdId } })
  await notify(householdId, `${staff.name} requested leave (${leave.startDate} → ${leave.endDate})`)
  broadcast(householdId)
  res.json(leave)
})

const statusSchema = z.object({ status: z.enum(['Pending', 'Approved', 'Declined']) })

// Only owners approve / decline.
leavesRouter.patch('/:id', requireOwner, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  const householdId = req.auth!.householdId
  const existing = await prisma.leave.findFirst({
    where: { id: req.params.id, householdId },
    include: { staff: true },
  })
  if (!existing) {
    res.status(404).json({ error: 'Leave not found' })
    return
  }
  const leave = await prisma.leave.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  })
  await notify(householdId, `${existing.staff.name}’s leave was ${leave.status.toLowerCase()}`)
  broadcast(householdId)
  res.json(leave)
})

leavesRouter.delete('/:id', requireOwner, async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.leave.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Leave not found' })
    return
  }
  await prisma.leave.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
