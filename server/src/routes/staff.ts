import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const staffRouter = Router()

const staffSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  language: z.string().min(1),
  salary: z.coerce.number().int().min(0),
  color: z.enum(['clay', 'green', 'blue']).default('clay'),
})

staffRouter.use(requireAuth)

staffRouter.post('/', requireOwner, async (req, res) => {
  const parsed = staffSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid staff details' })
    return
  }
  const householdId = req.auth!.householdId
  const staff = await prisma.staff.create({ data: { ...parsed.data, householdId } })
  await notify(householdId, `${staff.name} was added to your staff`)
  broadcast(householdId)
  res.json(staff)
})

staffRouter.put('/:id', requireOwner, async (req, res) => {
  const parsed = staffSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid staff details' })
    return
  }
  const householdId = req.auth!.householdId
  const existing = await prisma.staff.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }
  const staff = await prisma.staff.update({ where: { id: existing.id }, data: parsed.data })
  await notify(householdId, `${staff.name}’s profile was updated`)
  broadcast(householdId)
  res.json(staff)
})

staffRouter.delete('/:id', requireOwner, async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.staff.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }
  await prisma.staff.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
