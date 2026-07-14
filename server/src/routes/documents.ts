import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, requireOwner } from '../auth.js'
import { broadcast } from '../realtime.js'
import { notify } from '../notify.js'

export const documentsRouter = Router()

// Documents are owner-only (sensitive records).
documentsRouter.use(requireAuth, requireOwner)

const createSchema = z.object({
  type: z.string().min(1),
  staffId: z.string().min(1),
  expiry: z.string().nullable().optional(),
})

documentsRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid document' })
    return
  }
  const householdId = req.auth!.householdId
  const staff = await prisma.staff.findFirst({ where: { id: parsed.data.staffId, householdId } })
  if (!staff) {
    res.status(404).json({ error: 'Staff not found' })
    return
  }
  const doc = await prisma.document.create({
    data: {
      householdId,
      type: parsed.data.type,
      staffId: staff.id,
      expiry: parsed.data.expiry || null,
    },
  })
  await notify(householdId, `${doc.type} added for ${staff.name}`)
  broadcast(householdId)
  res.json(doc)
})

documentsRouter.delete('/:id', async (req, res) => {
  const householdId = req.auth!.householdId
  const existing = await prisma.document.findFirst({ where: { id: req.params.id, householdId } })
  if (!existing) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  await prisma.document.delete({ where: { id: existing.id } })
  broadcast(householdId)
  res.json({ ok: true })
})
